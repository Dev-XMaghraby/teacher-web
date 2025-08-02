'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const contactFormSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
});

export async function sendContactMessage(formData: unknown) {
  const parsedData = contactFormSchema.safeParse(formData);

  if (!parsedData.success) {
    return { success: false, error: 'البيانات غير صالحة.' };
  }
  
  try {
    const data = parsedData.data;
    await addDoc(collection(db, 'contactMessages'), {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    });
    return { success: true };
  } catch (error) {
    console.error('Error in sendContactMessage:', error);
    return { success: false, error: 'فشل إرسال الرسالة.' };
  }
}
