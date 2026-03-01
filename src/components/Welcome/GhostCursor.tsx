import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import './GhostCursor.css'

interface GhostCursorProps {
  className?: string
  style?: React.CSSProperties
  trailLength?: number
  inertia?: number
  grainIntensity?: number
  bloomStrength?: number
  bloomRadius?: number
  bloomThreshold?: number
  brightness?: number
  color?: string
  mixBlendMode?: string
  edgeIntensity?: number
  maxDevicePixelRatio?: number
  targetPixels?: number
  fadeDelayMs?: number
  fadeDurationMs?: number
  zIndex?: number
}

const GhostCursor = ({
  className,
  style,
  trailLength = 50,
  inertia = 0.5,
  grainIntensity = 0.05,
  bloomStrength = 0.1,
  bloomRadius = 1.0,
  bloomThreshold = 0.025,
  brightness = 1,
  color = '#B19EEF',
  mixBlendMode = 'screen',
  edgeIntensity = 0,
  maxDevicePixelRatio = 0.5,
  targetPixels,
  fadeDelayMs,
  fadeDurationMs,
  zIndex = 10,
}: GhostCursorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const bloomPassRef = useRef<UnrealBloomPass | null>(null)
  const filmPassRef = useRef<ShaderPass | null>(null)

  const trailBufRef = useRef<THREE.Vector2[]>([])
  const headRef = useRef(0)

  const rafRef = useRef<number | null>(null)
  // CHANGED: Store pixel coordinates directly, not normalized
  const currentMouseRef = useRef(new THREE.Vector2(0, 0))
  const velocityRef = useRef(new THREE.Vector2(0, 0))
  const fadeOpacityRef = useRef(1.0)
  const lastMoveTimeRef = useRef(performance.now())
  const pointerActiveRef = useRef(false)
  const runningRef = useRef(false)
  // CHANGED: Store actual screen dimensions
  const screenSizeRef = useRef(new THREE.Vector2(window.innerWidth, window.innerHeight))

  const isTouch = useMemo(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    []
  )

  const pixelBudget = targetPixels ?? (isTouch ? 0.9e6 : 1.3e6)
  const fadeDelay = fadeDelayMs ?? (isTouch ? 500 : 1000)
  const fadeDuration = fadeDurationMs ?? (isTouch ? 1000 : 1500)

  const baseVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  // CHANGED: Updated fragment shader to use pixel coordinates directly
  const fragmentShader = `
    uniform float iTime;
    uniform vec2  iResolution;
    uniform vec2  iMouse;
    uniform vec2  iPrevMouse[MAX_TRAIL_LENGTH];
    uniform float iOpacity;
    uniform float iScale;
    uniform vec3  iBaseColor;
    uniform float iBrightness;
    uniform float iEdgeIntensity;
    varying vec2  vUv;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f *= f * (3. - 2. * f);
      return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), f.x),
                 mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.5;
      mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for(int i=0;i<5;i++){
        v += a * noise(p);
        p = m * p * 2.0;
        a *= 0.5;
      }
      return v;
    }
    vec3 tint1(vec3 base){ return mix(base, vec3(1.0), 0.15); }
    vec3 tint2(vec3 base){ return mix(base, vec3(0.8, 0.9, 1.0), 0.25); }

    vec4 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 q = vec2(fbm(p * iScale + iTime * 0.1), fbm(p * iScale + vec2(5.2,1.3) + iTime * 0.1));
      vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * 0.15), fbm(p * iScale + q * 1.5 + vec2(8.3,2.8) + iTime * 0.15));

      float smoke = fbm(p * iScale + r * 0.8);
      float radius = 0.5 + 0.3 * (1.0 / iScale);
      float distFactor = 1.0 - smoothstep(0.0, radius * activity, length(p - mousePos));
      float alpha = pow(smoke, 2.5) * distFactor;

      vec3 c1 = tint1(iBaseColor);
      vec3 c2 = tint2(iBaseColor);
      vec3 color = mix(c1, c2, sin(iTime * 0.5) * 0.5 + 0.5);

      return vec4(color * alpha * intensity, alpha * intensity);
    }

    void main() {
      // CHANGED: Convert pixel coordinates to UV space for rendering
      vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
      
      // CHANGED: iMouse is now in pixels, convert to shader space
      vec2 mouse = (iMouse / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);

      vec3 colorAcc = vec3(0.0);
      float alphaAcc = 0.0;

      vec4 b = blob(uv, mouse, 1.0, iOpacity);
      colorAcc += b.rgb;
      alphaAcc += b.a;

      for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
        // CHANGED: Convert trail positions from pixels to shader space
        vec2 pm = (iPrevMouse[i] / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
        float t = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
        t = pow(t, 2.0);
        if (t > 0.01) {
          vec4 bt = blob(uv, pm, t * 0.8, iOpacity);
          colorAcc += bt.rgb;
          alphaAcc += bt.a;
        }
      }

      colorAcc *= iBrightness;

      vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
      float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
      float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
      float k = clamp(iEdgeIntensity, 0.0, 1.0);
      float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

      float outAlpha = clamp(alphaAcc * iOpacity * edgeMask, 0.0, 1.0);
      gl_FragColor = vec4(colorAcc, outAlpha);
    }
  `

  const FilmGrainShader = useMemo(() => ({
    uniforms: {
      tDiffuse: { value: null },
      iTime: { value: 0 },
      intensity: { value: grainIntensity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float iTime;
      uniform float intensity;
      varying vec2 vUv;

      float hash1(float n){ return fract(sin(n)*43758.5453); }

      void main(){
        vec4 color = texture2D(tDiffuse, vUv);
        float n = hash1(vUv.x*1000.0 + vUv.y*2000.0 + iTime) * 2.0 - 1.0;
        color.rgb += n * intensity * color.rgb;
        gl_FragColor = color;
      }
    `,
  }), [grainIntensity])

  const UnpremultiplyPass = useMemo(
    () =>
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: `
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            float a = max(c.a, 1e-5);
            vec3 straight = c.rgb / a;
            gl_FragColor = vec4(clamp(straight, 0.0, 1.0), c.a);
          }
        `,
      }),
    []
  )

  function calculateScale() {
    const base = 600
    const current = Math.min(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight))
    return Math.max(0.5, Math.min(2.0, current / base))
  }

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({
      antialias: !isTouch,
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: isTouch ? 'low-power' : 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    })
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer

    renderer.domElement.style.pointerEvents = 'none'
    if (mixBlendMode) {
      renderer.domElement.style.mixBlendMode = String(mixBlendMode)
    }

    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geom = new THREE.PlaneGeometry(2, 2)

    const maxTrail = Math.max(1, Math.floor(trailLength))
    // CHANGED: Initialize with pixel coordinates (0,0)
    trailBufRef.current = Array.from({ length: maxTrail }, () => new THREE.Vector2(0, 0))
    headRef.current = 0

    const baseColor = new THREE.Color(color)

    const material = new THREE.ShaderMaterial({
      defines: { MAX_TRAIL_LENGTH: maxTrail },
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        // CHANGED: Initialize iMouse with pixel coordinates
        iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
        iPrevMouse: { value: trailBufRef.current.map(v => v.clone()) },
        iOpacity: { value: 1.0 },
        iScale: { value: 1.0 },
        iBaseColor: { value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b) },
        iBrightness: { value: brightness },
        iEdgeIntensity: { value: edgeIntensity },
      },
      vertexShader: baseVertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    materialRef.current = material

    const mesh = new THREE.Mesh(geom, material)
    scene.add(mesh)

    const composer = new EffectComposer(renderer)
    composerRef.current = composer

    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), bloomStrength, bloomRadius, bloomThreshold)
    bloomPassRef.current = bloomPass
    composer.addPass(bloomPass)

    const filmPass = new ShaderPass(FilmGrainShader)
    filmPassRef.current = filmPass
    composer.addPass(filmPass)

    composer.addPass(UnpremultiplyPass)

    const resize = () => {
      const cssW = window.innerWidth
      const cssH = window.innerHeight
      
      // CHANGED: Update screen size reference
      screenSizeRef.current.set(cssW, cssH)

      const currentDPR = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio)
      const need = cssW * cssH * currentDPR * currentDPR
      const scale = need <= pixelBudget ? 1 : Math.max(0.5, Math.min(1, Math.sqrt(pixelBudget / Math.max(1, need))))
      const pixelRatio = currentDPR * scale

      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(cssW, cssH, true)
      composer.setSize(cssW, cssH)

      const wpx = Math.max(1, Math.floor(cssW * pixelRatio))
      const hpx = Math.max(1, Math.floor(cssH * pixelRatio))
      // CHANGED: Update iResolution as Vector2 (pixels)
      material.uniforms.iResolution.value.set(wpx, hpx)
      material.uniforms.iScale.value = calculateScale()
      bloomPass.setSize(wpx, hpx)
    }

    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    const animate = () => {
      const now = performance.now()
      const t = (now - start) / 1000

      const mat = materialRef.current!
      const comp = composerRef.current!

      if (pointerActiveRef.current) {
        velocityRef.current.set(
          currentMouseRef.current.x - mat.uniforms.iMouse.value.x,
          currentMouseRef.current.y - mat.uniforms.iMouse.value.y
        )
        mat.uniforms.iMouse.value.copy(currentMouseRef.current)
        fadeOpacityRef.current = 1.0
      } else {
        velocityRef.current.multiplyScalar(inertia)
        if (velocityRef.current.lengthSq() > 1e-6) {
          mat.uniforms.iMouse.value.add(velocityRef.current)
        }
        const dt = now - lastMoveTimeRef.current
        if (dt > fadeDelay) {
          const k = Math.min(1, (dt - fadeDelay) / fadeDuration)
          fadeOpacityRef.current = Math.max(0, 1 - k)
        }
      }

      const N = trailBufRef.current.length
      headRef.current = (headRef.current + 1) % N
      trailBufRef.current[headRef.current].copy(mat.uniforms.iMouse.value)
      const arr = mat.uniforms.iPrevMouse.value as THREE.Vector2[]
      for (let i = 0; i < N; i++) {
        const srcIdx = (headRef.current - i + N) % N
        arr[i].copy(trailBufRef.current[srcIdx])
      }

      mat.uniforms.iOpacity.value = fadeOpacityRef.current
      mat.uniforms.iTime.value = t

      const fp = filmPassRef.current as ShaderPass & { uniforms: Record<string, { value: unknown }> }
      if (fp?.uniforms?.iTime) {
        fp.uniforms.iTime.value = t
      }

      comp.render()

      if (!pointerActiveRef.current && fadeOpacityRef.current <= 0.001) {
        runningRef.current = false
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    const ensureLoop = () => {
      if (!runningRef.current) {
        runningRef.current = true
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      // Flip Y to match WebGL's bottom-up gl_FragCoord convention
      currentMouseRef.current.set(e.clientX, window.innerHeight - e.clientY)
      pointerActiveRef.current = true
      lastMoveTimeRef.current = performance.now()
      ensureLoop()
    }
    
    const onPointerLeave = () => {
      pointerActiveRef.current = false
      lastMoveTimeRef.current = performance.now()
      ensureLoop()
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave, { passive: true })

    ensureLoop()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      runningRef.current = false
      rafRef.current = null

      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', resize)

      scene.clear()
      geom.dispose()
      material.dispose()
      composer.dispose()
      renderer.dispose()

      if (renderer.domElement?.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    trailLength, inertia, grainIntensity, bloomStrength, bloomRadius, bloomThreshold,
    pixelBudget, fadeDelay, fadeDuration, isTouch, color, brightness, mixBlendMode, edgeIntensity,
  ])

  useEffect(() => {
    if (materialRef.current) {
      const c = new THREE.Color(color)
      materialRef.current.uniforms.iBaseColor.value.set(c.r, c.g, c.b)
    }
  }, [color])

  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.iBrightness.value = brightness
  }, [brightness])

  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.iEdgeIntensity.value = edgeIntensity
  }, [edgeIntensity])

  useEffect(() => {
    const fp = filmPassRef.current as ShaderPass & { uniforms: Record<string, { value: unknown }> } | null
    if (fp?.uniforms?.intensity) fp.uniforms.intensity.value = grainIntensity
  }, [grainIntensity])

  useEffect(() => {
    const el = rendererRef.current?.domElement
    if (!el) return
    if (mixBlendMode) el.style.mixBlendMode = String(mixBlendMode)
    else el.style.removeProperty('mix-blend-mode')
  }, [mixBlendMode])

  const mergedStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex,
    ...style,
  }), [zIndex, style])

  return <div ref={containerRef} className={className ?? ''} style={mergedStyle} />
}

export default GhostCursor