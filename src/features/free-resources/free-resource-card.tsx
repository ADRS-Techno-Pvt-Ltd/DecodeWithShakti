import { FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FreeResourceCard({
  id,
  title,
  description,
  categoryName,
  subjectName,
  thumbnailUrl,
  hasAnswerKey,
}: {
  id: string;
  title: string;
  description: string;
  categoryName: string | null;
  subjectName: string | null;
  thumbnailUrl: string | null;
  hasAnswerKey?: boolean;
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-muted text-primary">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <FileText className="h-6 w-6" strokeWidth={1.5} />
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categoryName && <Badge variant="outline">{categoryName}</Badge>}
          {subjectName && <Badge variant="outline">{subjectName}</Badge>}
        </div>
        <h3 className="font-heading mt-2.5 font-semibold">{title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            render={
              <a href={`/api/v1/files/free-resources/${id}`} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            }
          />
          {hasAnswerKey && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              render={
                <a href={`/api/v1/files/free-resources/${id}/answer-key`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  Answer Key
                </a>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
