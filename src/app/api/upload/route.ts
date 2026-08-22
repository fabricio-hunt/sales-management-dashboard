import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to a temp folder
    const tempDir = join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const filePath = join(tempDir, `upload_${Date.now()}.xlsx`);
    await writeFile(filePath, buffer);

    // Execute Python script
    // Assumes python/python3 is installed and requirements are met
    const scriptPath = join(process.cwd(), "scripts", "etl_processor.py");
    const command = `python "${scriptPath}" "${filePath}"`;

    try {
      const { stdout, stderr } = await execAsync(command);
      
      // Attempt to parse JSON from Python script
      try {
        const result = JSON.parse(stdout.trim());
        
        // Clean up temp file
        fs.unlinkSync(filePath);
        
        if (result.success) {
          return NextResponse.json(result, { status: 200 });
        } else {
          return NextResponse.json(result, { status: 400 });
        }
      } catch (parseError) {
        // Fallback if script didn't return clean JSON
        return NextResponse.json({ 
          success: false, 
          error: "Erro ao interpretar resposta do processador de dados.",
          details: stdout || stderr
        }, { status: 500 });
      }

    } catch (execError: any) {
      console.error(execError);
      return NextResponse.json({ 
        success: false, 
        error: "Falha ao executar o processamento (Python). Verifique os logs do servidor." 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Falha no servidor ao processar o upload." }, { status: 500 });
  }
}
