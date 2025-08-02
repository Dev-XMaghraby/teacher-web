
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookCopy } from 'lucide-react';
import { GRADE_LEVELS } from '@/lib/client-constants';

export default function LevelsPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
              المراحل الدراسية المتاحة
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
              نغطي جميع المراحل التعليمية لضمان تلبية احتياجات كل طالب.
          </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GRADE_LEVELS.map((level) => (
          <Card key={level.value} className="group hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
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
  );
}
