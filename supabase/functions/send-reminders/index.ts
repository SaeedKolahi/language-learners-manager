import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000)
    const nowIso = now.toISOString()
    const fiveMinutesLaterIso = fiveMinutesLater.toISOString()

    // Get reminders: past reminders (not sent) + reminders in next 5 minutes
    const { data: reminders, error: remindersError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('sent', false)
      .eq('completed', false)
      .lte('reminder_at', fiveMinutesLaterIso)  // Includes past reminders and next 5 minutes
      .order('reminder_at', { ascending: true })

    if (remindersError) {
      throw remindersError
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get unique user IDs
    const userIds = [...new Set(reminders.map(r => r.user_id))]
    
    // Get user profiles for these users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('user_profiles')
      .select('user_id, chat_id, telegram_token, name')
      .in('user_id', userIds)

    if (profilesError) {
      throw profilesError
    }

    // Create a map for quick lookup
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(p => profileMap.set(p.user_id, p))
    }

    const results: Array<{
      reminder_id: string
      status: string
      learner_name?: string
      reason?: string
      details?: string
    }> = []

    for (const reminder of reminders) {
      const profile = profileMap.get(reminder.user_id)
      const userName = profile?.name || 'کاربر'
      
      if (!profile?.chat_id || !profile?.telegram_token) {
        results.push({
          reminder_id: reminder.id,
          status: 'skipped',
          reason: 'Missing chat_id or telegram_token'
        })
        continue
      }

      const timeStr = new Date(reminder.reminder_at).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const dateStr = formatDatePersian(reminder.reminder_at)
      
      // Get phone from learners table if available
      const { data: learner } = await supabaseClient
        .from('learners')
        .select('phone')
        .eq('id', reminder.learner_id)
        .single()
      
      const phone = learner?.phone || ''
      let phoneText = ''
      if (phone) {
        const phoneDigits = phone.replace(/\D/g, '')
        const phoneInternational = phoneDigits.startsWith('0') ? `+98${phoneDigits.substring(1)}` : `+98${phoneDigits}`
        const phoneWithDirection = `\u200E${phoneInternational}\u200E`
        phoneText = `\nشماره تماس: ${phoneWithDirection}`
      }
      const descText = reminder.description ? `\nتوضیحات: ${reminder.description}` : ''
      
      const reminderText = `سلام ${userName} 👋\n\n⏰ یادآور زبان‌آموز\nنام: ${reminder.learner_name}${phoneText}\nزمان: ${dateStr} ${timeStr}${descText}`

      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${profile.telegram_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.chat_id,
              text: reminderText
            })
          }
        )

        if (telegramResponse.ok) {
          await supabaseClient
            .from('reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id)

          results.push({
            reminder_id: reminder.id,
            status: 'sent',
            learner_name: reminder.learner_name
          })
        } else {
          const errorText = await telegramResponse.text()
          results.push({
            reminder_id: reminder.id,
            status: 'failed',
            reason: `Telegram API error: ${telegramResponse.status}`,
            details: errorText
          })
        }
      } catch (err) {
        results.push({
          reminder_id: reminder.id,
          status: 'error',
          reason: err.message || 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processed reminders',
        count: reminders.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Convert Gregorian to Jalali (Persian) date
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = (gy <= 1600) ? 0 : 979
  let gy2 = (gy <= 1600) ? gy : gy - 1600
  let days = (365 * gy2) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1]
  jy += 33 * Math.floor(days / 12053)
  days = days % 12053
  jy += 4 * Math.floor(days / 1461)
  days = days % 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30))
  return [jy, jm, jd]
}

// Convert English digits to Persian
function toPersianDigits(str: string | number): string {
  if (!str && str !== 0) return ''
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit)])
}

// Format Persian date (Jalali)
function formatDatePersian(isoString: string): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    
    const gy = date.getFullYear()
    const gm = date.getMonth() + 1
    const gd = date.getDate()
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd)
    
    const year = String(jy)
    const month = String(jm).padStart(2, '0')
    const day = String(jd).padStart(2, '0')
    const jalali = `${year}/${month}/${day}`
    return toPersianDigits(jalali)
  } catch {
    return isoString
  }
}

