
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { GraduationCap, Mic, PenTool, User } from 'lucide-react';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
              عن فارس اللغة العربية
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
              منصة تعليمية متكاملة لخدمة طلاب اللغة العربية، تحت إشراف وتأسيس دكتور سيد حشمت ابوفرغل.
          </p>
      </div>
      <Card className="w-full max-w-4xl mx-auto p-8 bg-card">
          <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary mb-4">من هو د/ سيد حشمت ابوفرغل؟</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 text-lg text-muted-foreground">
             <div className="flex items-start gap-4">
                <GraduationCap className="h-8 w-8 text-primary mt-1" />
                <p>خبير في الأدب والنقد والبلاغة العربية، ومحاضر في عدة جامعات عربية ووزارة الثقافة المصرية.</p>
             </div>
             <div className="flex items-start gap-4">
                <User className="h-8 w-8 text-primary mt-1" />
                <p>معلم خبير بوزارة التربية والتعليم المصرية، يتمتع بخبرة طويلة في تدريس المناهج لجميع المراحل التعليمية.</p>
             </div>
             <div className="flex items-start gap-4">
                <PenTool className="h-8 w-8 text-primary mt-1" />
                <p>شاعر وكاتب مرموق، له العديد من المؤلفات والأعمال الأدبية التي تخدم اللغة العربية.</p>
             </div>
             <div className="flex items-start gap-4">
                <Mic className="h-8 w-8 text-primary mt-1" />
                <p>يسعى من خلال هذه المنصة إلى تقديم علمه وخبرته لخدمة طلاب اللغة العربية في كل مكان، وتبسيط العلوم اللغوية لهم.</p>
             </div>
          </CardContent>
      </Card>
    </div>
  );
}
