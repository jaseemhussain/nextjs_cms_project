import { NextResponse } from "next/server";
import { AuthError, registerUser } from "@/services/auth.service";

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const result = await registerUser({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name ?? "",
    });

    return NextResponse.json(
      {
        message: "Registered successfully",
        user: result.user,
        token: result.token,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("register error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
