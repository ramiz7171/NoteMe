import { FC, useRef, useState, useEffect, useMemo, MutableRefObject } from 'react';
import { quat, vec2, vec3 } from 'gl-matrix';

/* ------------------------------------------------------------------ */
/*  Geometry helpers — generate icosahedron sphere points (pure math)  */
/* ------------------------------------------------------------------ */

class Face {
  constructor(public a: number, public b: number, public c: number) {}
}

class Vertex {
  public position: vec3;
  public normal: vec3;

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
  }
}

class Geometry {
  public vertices: Vertex[] = [];
  public faces: Face[] = [];

  public addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  public addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  public subdivide(divisions = 1): this {
    const midPointCache: Record<string, number> = {};
    let f = this.faces;

    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array<Face>(f.length * 4);
      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);
        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });
      f = newFaces;
    }
    this.faces = f;
    return this;
  }

  public spherize(radius = 1): this {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  private getMidPoint(ndxA: number, ndxB: number, cache: Record<string, number>): number {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Arcball rotation control (pure math + pointer events)              */
/* ------------------------------------------------------------------ */

class ArcballControl {
  private el: HTMLElement;
  public isPointerDown = false;
  public orientation = quat.create();
  public pointerRotation = quat.create();
  public rotationVelocity = 0;
  public rotationAxis = vec3.fromValues(1, 0, 0);
  public snapDirection = vec3.fromValues(0, 0, -1);
  public snapTargetDirection: vec3 | null = null;

  private pointerPos = vec2.create();
  private previousPointerPos = vec2.create();
  private _rotationVelocity = 0;
  private _combinedQuat = quat.create();
  private readonly EPSILON = 0.1;
  private readonly IDENTITY_QUAT = quat.create();
  private cleanupFns: (() => void)[] = [];

  constructor(el: HTMLElement) {
    this.el = el;

    const onPointerDown = (e: PointerEvent) => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    };
    const onPointerUp = () => { this.isPointerDown = false; };
    const onPointerLeave = () => { this.isPointerDown = false; };
    const onPointerMove = (e: PointerEvent) => {
      if (this.isPointerDown) vec2.set(this.pointerPos, e.clientX, e.clientY);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('pointermove', onPointerMove);
    el.style.touchAction = 'none';

    this.cleanupFns.push(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('pointermove', onPointerMove);
    });
  }

  public destroy(): void {
    this.cleanupFns.forEach(fn => fn());
  }

  public update(deltaTime: number, targetFrameDuration = 16): void {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        const p = this.project(midPointerPos);
        const q = this.project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);

      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;
  }

  private quatFromVectors(a: vec3, b: vec3, out: quat, angleFactor = 1): void {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
  }

  private project(pos: vec2): vec3 {
    const r = 2;
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;
    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq);
    } else {
      z = rSq / Math.sqrt(xySq);
    }
    return vec3.fromValues(-x, y, z);
  }
}

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface MenuItem {
  image: string;
  link: string;
  title: string;
  description: string;
}

interface InfiniteMenuProps {
  items?: MenuItem[];
  scale?: number;
  onItemClick?: (item: MenuItem) => void;
}

/* ------------------------------------------------------------------ */
/*  Smooth-step utility                                                */
/* ------------------------------------------------------------------ */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/*  Component — pure CSS/JS sphere, zero WebGL                         */
/* ------------------------------------------------------------------ */

const SPHERE_RADIUS = 2;
const CARD_SIZE = 80; // px
const HALF_CARD = CARD_SIZE / 2;

const InfiniteMenu: FC<InfiniteMenuProps> = ({ items = [], scale = 1.0, onItemClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Generate 42 sphere surface points (icosahedron subdivided once)
  const spherePoints = useMemo(() => {
    const ico = new IcosahedronGeometry();
    ico.subdivide(1).spherize(SPHERE_RADIUS);
    return ico.vertices.map(v => vec3.clone(v.position));
  }, []);

  const DISC_COUNT = spherePoints.length;

  // Animation loop — runs entirely outside React render cycle for performance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const control = new ArcballControl(container);
    let rafId: number;
    let lastTime = 0;
    let smoothVel = 0;
    let movActive = false;
    let cameraZ = 3 * scale;
    const baseCameraZ = 3 * scale;

    const animate = (time: number) => {
      const dt = Math.min(32, time - lastTime);
      lastTime = time;
      const timeScale = dt / (1000 / 60) + 0.0001;

      control.update(dt, 1000 / 60);
      smoothVel = control.rotationVelocity;

      const isMovingNow = control.isPointerDown || Math.abs(smoothVel) > 0.01;
      if (isMovingNow !== movActive) {
        movActive = isMovingNow;
        setIsMoving(isMovingNow);
      }

      // Snap + camera zoom
      let camTarget = baseCameraZ;
      let damping = 5 / timeScale;

      if (!control.isPointerDown) {
        // Find nearest vertex to snap to
        const snapDir = vec3.fromValues(0, 0, -1);
        const invOri = quat.conjugate(quat.create(), control.orientation);
        const nt = vec3.transformQuat(vec3.create(), snapDir, invOri);
        let maxD = -Infinity, nearestIdx = 0;
        for (let i = 0; i < spherePoints.length; i++) {
          const d = vec3.dot(nt, spherePoints[i]);
          if (d > maxD) { maxD = d; nearestIdx = i; }
        }
        const itemIdx = nearestIdx % Math.max(1, items.length);
        setActiveItem(items[itemIdx] || null);
        const worldPos = vec3.transformQuat(vec3.create(), spherePoints[nearestIdx], control.orientation);
        control.snapTargetDirection = vec3.normalize(vec3.create(), worldPos);
      } else {
        camTarget += control.rotationVelocity * 80 + 2.5;
        damping = 7 / timeScale;
      }

      cameraZ += (camTarget - cameraZ) / damping;

      // Project 3D → 2D and position DOM cards
      const w = container.clientWidth;
      const h = container.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const focalLen = Math.min(w, h) * 0.5;

      for (let i = 0; i < DISC_COUNT; i++) {
        const p = vec3.transformQuat(vec3.create(), spherePoints[i], control.orientation);
        const dist = cameraZ - p[2];
        const persp = cameraZ / Math.max(0.01, dist);
        const sx = cx + (p[0] * focalLen * persp) / cameraZ;
        const sy = cy - (p[1] * focalLen * persp) / cameraZ;
        const nz = p[2] / SPHERE_RADIUS; // -1 … +1
        const alpha = smoothstep(0.3, 1.0, nz) * 0.9 + 0.1;
        const cardScale = persp * 0.35 * scale;

        // Motion stretch effect
        const stretchX = 1 + Math.abs(control.rotationAxis[1]) * smoothVel * 3;
        const stretchY = 1 + Math.abs(control.rotationAxis[0]) * smoothVel * 3;

        const card = cardRefs.current[i];
        if (card) {
          card.style.transform =
            `translate3d(${sx - HALF_CARD}px,${sy - HALF_CARD}px,0) scale(${cardScale * stretchX},${cardScale * stretchY})`;
          card.style.opacity = String(alpha);
          card.style.zIndex = String(Math.round((nz + 1) * 50));
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      control.destroy();
    };
  }, [spherePoints, items, scale, DISC_COUNT]);

  const handleButtonClick = () => {
    if (activeItem && onItemClick) onItemClick(activeItem);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ background: 'linear-gradient(to bottom, #030710, #0a1628, #030710)' }}
    >
      {/* Sphere disc cards */}
      {Array.from({ length: DISC_COUNT }).map((_, i) => {
        const itemIdx = i % Math.max(1, items.length);
        const item = items[itemIdx];
        return (
          <div
            key={i}
            ref={el => { cardRefs.current[i] = el; }}
            className="absolute top-0 left-0 rounded-full overflow-hidden will-change-transform pointer-events-none"
            style={{
              width: CARD_SIZE,
              height: CARD_SIZE,
              backfaceVisibility: 'hidden',
            }}
          >
            {item?.image ? (
              <img
                src={item.image}
                className="w-full h-full object-cover"
                draggable={false}
                alt=""
              />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
          </div>
        );
      })}

      {/* Active item overlay */}
      {activeItem && (
        <>
          <h2
            className={`
              select-none absolute font-black text-2xl sm:text-3xl md:text-4xl
              left-6 top-1/2 -translate-y-1/2
              text-white
              transition-all ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              ${isMoving
                ? 'opacity-0 pointer-events-none duration-100 translate-x-4'
                : 'opacity-100 pointer-events-auto duration-500 translate-x-0'
              }
            `}
          >
            {activeItem.title}
          </h2>

          <p
            className={`
              select-none absolute max-w-[12ch] text-sm sm:text-base
              top-1/2 right-6
              text-gray-400
              transition-all ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              ${isMoving
                ? 'opacity-0 pointer-events-none duration-100 -translate-x-4 -translate-y-1/2'
                : 'opacity-100 pointer-events-auto duration-500 translate-x-0 -translate-y-1/2'
              }
            `}
          >
            {activeItem.description}
          </p>

          <div
            onClick={handleButtonClick}
            className={`
              absolute left-1/2 z-[200] w-12 h-12
              grid place-items-center
              bg-[var(--accent)] border-2 border-white/20
              rounded-full cursor-pointer
              transition-all ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
              hover:scale-110
              ${isMoving
                ? 'bottom-[-60px] opacity-0 pointer-events-none duration-100 scale-0 -translate-x-1/2'
                : 'bottom-6 opacity-100 pointer-events-auto duration-500 scale-100 -translate-x-1/2'
              }
            `}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default InfiniteMenu;
