import * as React from "react"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export interface FileUploadEntry {
  name: string
  status: "uploading" | "done" | "error"
  progress: number
  error?: string
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  uploads?: FileUploadEntry[]
  className?: string
}

function FileUpload({
  onFilesSelected,
  accept,
  multiple = true,
  uploads = [],
  className,
}: FileUploadProps) {
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim())
        const filtered = files.filter((f) =>
          acceptedTypes.some((type) => {
            if (type.startsWith(".")) return f.name.toLowerCase().endsWith(type)
            if (type.endsWith("/*")) return f.type.startsWith(type.replace("/*", "/"))
            return f.type === type
          })
        )
        onFilesSelected(filtered)
      } else {
        onFilesSelected(files)
      }
    },
    [onFilesSelected, accept]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onFilesSelected(files)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
          dragOver
            ? "border-primary bg-primary/5 [&_svg]:text-primary"
            : "border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/30"
        )}
      >
        <Upload
          className={cn(
            "size-5 transition-colors",
            dragOver ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div>
          <p className="text-sm text-muted-foreground">
            {dragOver ? "Drop files here" : "Drop files here or click to browse"}
          </p>
          {accept && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Accepted: {accept}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                {u.status === "uploading" && (
                  <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                )}
                {u.status === "done" && (
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                )}
                {u.status === "error" && (
                  <AlertCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <span className="truncate text-foreground/80">{u.name}</span>
                {u.status === "uploading" && (
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {u.progress}%
                  </span>
                )}
              </div>
              {u.status === "uploading" && <Progress value={u.progress} className="h-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { FileUpload }
