import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db";
import { registerSchema, loginSchema } from "../utils/validation";
import z, { number, string } from "zod";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const ZodForCreateService = z.object({
  name: z.literal("Physiotherapy"),

  type: z.enum([
    "MEDICAL",
    "HOUSE_HELP",
    "BEAUTY",
    "FITNESS",
    "EDUCATION",
    "OTHER",
  ]),

  durationMinutes: z
    .number()
    .int()
    .gte(30)
    .lte(120)
    .refine((val) => val % 30 === 0, {
      message: "Invalid input",
    }),
});

const zodForSetAvailability = z.object({
  dayOfWeek: number,
  startTime: string,
  endTime: string,
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
      },
    });

    res
      .status(201)
      .json({ message: `User created Successfully with id ${user.id}` });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input", details: error });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({ token });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function CreateService(req: Request, res: Response): Promise<any> {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const data = ZodForCreateService.parse(req.body);
    if (!data) {
      return res.status(400).json({
        error: "Invalid input",
      });
    }
    const { name, durationMinutes, type } = data;
    const createService = await prisma.service.create({
      data: {
        name: name,
        durationMinutes: durationMinutes,
        type: type,
        createdAt: new Date(),
        userId: userId,
      },
    });
    return res.status(201).json({
      id: createService.id,
      name: createService.name,
      type: createService.type,
      durationMinutes: createService.durationMinutes,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: " Internal server error",
    });
  }
}

// **POST** `/services/:serviceId/availability`

// ### Request Body

// ```json
// {
// "dayOfWeek":4,
// "startTime":"09:00",
// "endTime":"12:00"
// }
// ```

// ### Constraints

// - `dayOfWeek` must be 0–6 (0-sunday , 6-saturday)
// - Time format rules apply
// - Availability must not overlap existing availability for the service

// ### Success

// **201 Created**

// ### Errors

// - `400` Invalid input or time format
// - `403` Service does not belong to provider
// - `404` Service not found
// - `409` Overlapping availability
// - `500` Internal server error

export async function SetAvailability(
  req: Request,
  res: Response,
): Promise<any> {
  try {
    const serviceId: string | unknown = req.params.serviceId;
    const { startTime, endTime, dayOfWeek } = zodForSetAvailability.parse(
      req.body,
    );
    if (!startTime || !endTime || !dayOfWeek || !serviceId) {
      return res.status(400).json({
        error: "Invalid input or time format",
      });
    }

    const findService = await prisma.service.findFirst({
      where: {
        id: serviceId,
      },
    });

    if (!findService) {
      return res.status(500).json({
        error: "Service not found",
      });
    }
    const findslote = await prisma.availability.findMany({
      where: {
        serviceId: serviceId,
        dayOfWeek: dayOfWeek,
      },
    });
    const userStartingTime = (startTime as string).split(",");
    const userEndingTime = (endTime as string).split(",");

    if (findslote.length != 0) {
      findslote.forEach((element) => {
        const startSplitDate = element.startTime.split(",");
        const endSplitDate = element.startTime.split(",");

        if (
          number(startSplitDate[0]) <= number(userStartingTime[0]) &&
          number(endSplitDate[0]) > number(userStartingTime[0])
        ) {
          return res.status(500).json({
            error: "Overlapping availability",
          });
        }

        if (number(userEndingTime[0]) < number(startSplitDate[0])) {
          return res.status(500).json({
            error: "Overlapping availability",
          });
        }
      });
    }

    const createShedule = await prisma.availability.create({
      data: {
        dayOfWeek: dayOfWeek as number,
        serviceId: serviceId as string,
        endTime: endTime as string,
        startTime: startTime as string,
      },
    });

    return res.status(201).json({
      success: "Created",
      data: createShedule,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

export async function getServices(req: Request, res: Response): Promise<any> {
  try {
    const type = req.params.type;
    if (!type) {
      return res.status(500).json({
        error: "type not found ",
      });
    }

    const findSvc = await prisma.service.findMany({
      where: {
        type: type as any,
      },
    });

    return res.status(200).json({ success: true, data: findSvc });
  } catch (error: any) {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
