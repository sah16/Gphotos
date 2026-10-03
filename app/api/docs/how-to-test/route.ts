import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'HOW_TO_TEST.md');
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to read HOW_TO_TEST.md', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
