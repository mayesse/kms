import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const academyRepository = {
  // === STUDENTS ===
  async getStudents(storeId, filters = {}) {
    let query = supabase
      .from('academy_students')
      .select('*, academy_enrollments!left(*, academy_courses!left(name)), academy_payments!left(amount, status)')
      .eq('store_id', storeId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.level) query = query.eq('level', filters.level)
    if (filters.search) query = query.ilike('name', `%${filters.search}%`)
    const { data, error } = await query.order('name')
    if (error) throw error
    return data || []
  },

  async getStudentById(storeId, id) {
    const { data, error } = await supabase
      .from('academy_students')
      .select('*, academy_enrollments(*, academy_courses(*)), academy_payments(*), academy_assessments(*), academy_attendance!left(*, academy_class_sessions!left(date, topic))')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createStudent(storeId, student) {
    const { data, error } = await supabase
      .from('academy_students')
      .insert({ ...student, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'academy_student_created', 'academy_student', data.id, data.name)
    return data
  },

  async updateStudent(storeId, id, student) {
    const { data, error } = await supabase
      .from('academy_students')
      .update({ ...student, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteStudent(storeId, id) {
    const { error } = await supabase
      .from('academy_students')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
  },

  // === TEACHERS ===
  async getTeachers(storeId) {
    const { data, error } = await supabase
      .from('academy_teachers')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async createTeacher(storeId, teacher) {
    const { data, error } = await supabase
      .from('academy_teachers')
      .insert({ ...teacher, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'academy_teacher_created', 'academy_teacher', data.id, data.name)
    return data
  },

  async updateTeacher(storeId, id, teacher) {
    const { data, error } = await supabase
      .from('academy_teachers')
      .update({ ...teacher, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === COURSES ===
  async getCourses(storeId) {
    const { data, error } = await supabase
      .from('academy_courses')
      .select('*, academy_teachers(name)')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async createCourse(storeId, course) {
    const { data, error } = await supabase
      .from('academy_courses')
      .insert({ ...course, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'academy_course_created', 'academy_course', data.id, data.name)
    return data
  },

  async updateCourse(storeId, id, course) {
    const { data, error } = await supabase
      .from('academy_courses')
      .update({ ...course, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === SCHEDULE ===
  async getSessions(storeId, dateFrom, dateTo) {
    let query = supabase
      .from('academy_class_sessions')
      .select('*, academy_courses(name), academy_teachers(name), academy_attendance!left(id, student_id, present)')
      .eq('store_id', storeId)
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
    const { data, error } = await query.order('date').order('start_time')
    if (error) throw error
    return data || []
  },

  async createSession(storeId, session) {
    const { data, error } = await supabase
      .from('academy_class_sessions')
      .insert({ ...session, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'academy_session_created', 'academy_class_session', data.id)
    return data
  },

  async updateSession(storeId, id, session) {
    const { data, error } = await supabase
      .from('academy_class_sessions')
      .update({ ...session, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === ATTENDANCE ===
  async getAttendance(storeId, sessionId) {
    const { data, error } = await supabase
      .from('academy_attendance')
      .select('*, academy_students(name)')
      .eq('store_id', storeId)
      .eq('session_id', sessionId)
    if (error) throw error
    return data || []
  },

  async saveAttendance(storeId, sessionId, records) {
    const { error } = await supabase
      .from('academy_attendance')
      .upsert(records.map(r => ({ ...r, store_id: storeId, session_id: sessionId })), { onConflict: 'session_id,student_id' })
    if (error) throw error
  },

  // === ENROLLMENTS ===
  async enrollStudent(storeId, enrollment) {
    const { data, error } = await supabase
      .from('academy_enrollments')
      .insert({ ...enrollment, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === PAYMENTS ===
  async getPayments(storeId, studentId) {
    let query = supabase
      .from('academy_payments')
      .select('*, academy_students(name)')
      .eq('store_id', storeId)
    if (studentId) query = query.eq('student_id', studentId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addPayment(storeId, payment) {
    const paymentData = { ...payment, store_id: storeId }
    if (paymentData.paid_date) paymentData.status = 'paid'
    const { data, error } = await supabase
      .from('academy_payments')
      .insert(paymentData)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'academy_payment_recorded', 'academy_payment', data.id, `${data.amount}`)
    return data
  },

  // === ASSESSMENTS ===
  async addAssessment(storeId, assessment) {
    const { data, error } = await supabase
      .from('academy_assessments')
      .insert({ ...assessment, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === REPORTS ===
  async getDashboardStats(storeId) {
    const [studentsRes, teachersRes, coursesRes, sessionsRes, paymentsRes] = await Promise.all([
      supabase.from('academy_students').select('id, status').eq('store_id', storeId),
      supabase.from('academy_teachers').select('id, status').eq('store_id', storeId),
      supabase.from('academy_courses').select('id, status').eq('store_id', storeId),
      supabase.from('academy_class_sessions').select('id, status').eq('store_id', storeId),
      supabase.from('academy_payments').select('amount, status').eq('store_id', storeId),
    ])
    const students = studentsRes.data || []
    const teachers = teachersRes.data || []
    const payments = paymentsRes.data || []
    return {
      total_students: students.filter(s => s.status === 'active').length,
      total_teachers: teachers.filter(t => t.status === 'active').length,
      total_courses: coursesRes.data?.filter(c => c.status === 'active').length || 0,
      total_sessions: sessionsRes.data?.length || 0,
      total_revenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      pending_payments: payments.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
    }
  },
}
