import { supabase } from '../lib/supabase'

export const contactRepository = {
  async send(name, email, message, phone) {
    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message, phone })
    if (error) throw error
  },
}
