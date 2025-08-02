
import Image from 'next/image';
import Link from 'next/link';
import { BookCopy, BookOpen, PencilRuler, Users, Video, GraduationCap, Mic, PenTool, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { GRADE_LEVELS } from '@/lib/client-constants';
import { ContactSection } from '@/components/contact-section';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DoctorInfo {
  profileImageUrl?: string;
  cvContent?: string;
}

export default async function Home() {
  let doctorInfo: DoctorInfo | null = null;
  try {
    const docRef = doc(db, "settings", "doctorInfo");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      doctorInfo = docSnap.data() as DoctorInfo;
    }
  } catch (error) {
    console.error("Error fetching doctor info:", error);
    // Continue rendering the page even if Firestore fetch fails
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section
          id="hero"
          className="relative w-full h-[90vh] min-h-[600px] flex items-center justify-center text-center text-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
           <Image
            src="https://images.unsplash.com/photo-1519682577862-22b62b24e493?q=80&w=2070&auto=format&fit=crop"
            alt="خلفية للموقع"
            layout="fill"
            objectFit="cover"
            priority
            quality={80}
            className="z-0"
            data-ai-hint="dark library books"
          />
          <div className="relative z-20 container px-4 md:px-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold text-white mb-4">
              د. <span className="text-primary">سيد حشمت</span> أبوفرغل
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/90 mb-8">
              دكتور الأدب والنقد والبلاغة العربية، محاضر ببعض الجامعات العربية وبوزارة الثقافة المصرية
              <br />
              معلم بوزارة التربية والتعليم المصرية - شاعر وكاتب
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-headline text-lg">
                <Link href="/register">ابدأ رحلتك التعليمية</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-center text-primary mb-12">
              ماذا نقدم لطلابنا؟
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<PencilRuler className="w-10 h-10 text-primary" />}
                title="امتحانات تفاعلية"
                description="اختبر مستواك بامتحانات شاملة تحاكي الواقع مع تصحيح فوري وتحليل للأداء."
              />
              <FeatureCard
                icon={<Video className="w-10 h-10 text-primary" />}
                title="شروحات بالفيديو"
                description="شروحات فيديو مبسطة وعميقة لكل أجزاء المنهج الدراسي لمساعدتك على الفهم."
              />
              <FeatureCard
                icon={<BookOpen className="w-10 h-10 text-primary" />}
                title="مكتبة شاملة"
                description="اطلع على مؤلفات وأشعار الدكتور سيد حشمت لتنمية ثقافتك اللغوية والأدبية."
              />
              <FeatureCard
                icon={<Users className="w-10 h-10 text-primary" />}
                title="متابعة شخصية"
                description="نظام متكامل لمتابعة نتائج الطلاب وتقديم الدعم اللازم لهم للتفوق."
              />
            </div>
          </div>
        </section>

        <section id="levels" className="py-12 md:py-24 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-4">
                    المراحل الدراسية المتاحة
                </h2>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                    نغطي جميع المراحل التعليمية لضمان تلبية احتياجات كل طالب.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {GRADE_LEVELS.map((level) => (
                <Card key={level.value} className="group hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer bg-background">
                  <CardContent className="p-6 flex items-center gap-4">
                    <BookCopy className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {level.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="py-12 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center justify-center text-center mb-12">
                <Image
                  src={doctorInfo?.profileImageUrl || "https://placehold.co/180x180.png"}
                  alt="دكتور/ سيد حشمت ابوفرغل"
                  width={180}
                  height={180}
                  className="rounded-full w-44 h-44 object-cover border-4 border-primary/80 shadow-lg mb-6"
                  data-ai-hint="teacher portrait"
                />
                <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
                    عن فارس اللغة العربية
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                    منصة تعليمية متكاملة لخدمة طلاب اللغة العربية، تحت إشراف وتأسيس دكتور سيد حشمت ابوفرغل.
                </p>
            </div>
            <Card className="w-full p-8 bg-card">
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
        </section>

        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-card text-center hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-2 border-border/80">
      <CardHeader>
        <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">{icon}</div>
        <CardTitle className="font-headline text-2xl text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
