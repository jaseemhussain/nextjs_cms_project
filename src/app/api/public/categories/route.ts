import { NextResponse } from "next/server";
import { getAllCategories } from "@/services/category.service";

/**
 * GET /api/public/categories
 * No auth — for public filters / labels
 */
export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("public categories error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
