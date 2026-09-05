import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  phase: string;
  description: string;
}

export function ComingSoon({ phase, description }: ComingSoonProps) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Badge variant="secondary" className="rounded-full px-4 py-1">
          {phase}
        </Badge>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
