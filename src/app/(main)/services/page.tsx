import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const services = [
  {
    title: 'تصحيح الامتحانات والواجبات',
    description: 'خدمة تصحيح دقيقة وفورية لجميع أنواع الامتحانات والواجبات، مع تقديم ملاحظات مفصلة لمساعدة الطالب على فهم أخطائه وتحسين مستواه.',
  },
  {
    title: 'متابعة دورية للطالب',
    description: 'نظام متابعة مستمر لأداء الطالب من خلال تقارير دورية توضح نقاط القوة والضعف، وتقديم خطط تطوير شخصية لكل طالب.',
  },
  {
    title: 'تأسيس الطلاب في اللغة العربية',
    description: 'برامج تأسيسية متكاملة لجميع المراحل التعليمية، تركز على بناء أساس قوي في النحو والصرف والبلاغة والأدب.',
  },
  {
    title: 'شرح المناهج الدراسية',
    description: 'شروحات فيديو تفصيلية ومبسطة لجميع المناهج الدراسية المقررة، لمساعدة الطلاب على استيعاب الدروس بسهولة ويسر.',
  },
  {
    title: 'تدريبات مكثفة',
    description: 'مجموعة واسعة من التدريبات والتمارين التفاعلية على كل درس، لترسيخ الفهم وتطوير المهارات اللغوية لدى الطالب.',
  },
  {
    title: 'دورات متخصصة',
    description: 'دورات متقدمة في مجالات متخصصة مثل الشعر، النقد الأدبي، والبلاغة، لتمكين الطلاب المتميزين من تعميق معرفتهم.',
  },
];

export default function ServicesPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
              خدماتنا التعليمية
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
              نقدم مجموعة متكاملة من الخدمات لدعم رحلتك في تعلم اللغة العربية وإتقانها.
          </p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <Card key={index} className="flex flex-col hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary flex items-center gap-3">
                <CheckCircle className="h-7 w-7" />
                {service.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-base">
                {service.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
