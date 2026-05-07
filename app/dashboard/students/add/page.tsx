import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AddStudentsClient from '@/components/students/AddStudentsClient'

export default function AddStudentsPage() {
  return <AddStudentsClient />
}