// Recovery code functions that work with any Supabase client
// The client is passed in to avoid import path issues between web and mobile

export async function generateRecoveryCodes(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('generate_recovery_codes', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return (data as string[]) ?? []
}

export async function verifyRecoveryCode(supabase: any, userId: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_recovery_code', {
    p_user_id: userId,
    p_code: code.toUpperCase().trim(),
  })
  if (error) return false
  return !!data
}

export async function countRecoveryCodes(supabase: any, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_recovery_codes', { p_user_id: userId })
  if (error) return 0
  return (data as number) ?? 0
}
