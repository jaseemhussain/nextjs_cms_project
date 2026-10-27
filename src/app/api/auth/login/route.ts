import { NextResponse } from "next/server";
import { AuthError, loginUser } from "@/services/auth.service";

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const result = await loginUser({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({
      message: "Login successful",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
