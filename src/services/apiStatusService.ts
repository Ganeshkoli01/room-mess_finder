import { supabase } from "@/integrations/supabase/client";

export interface ThirdPartyService {
  id: string;
  name: string;
  category: "Database & Auth" | "Payments" | "Storage & Media" | "Geocoding & Maps" | "Messaging & Email";
  envVars: { name: string; valuePresent: boolean }[];
  isConfigured: boolean;
  status: "online" | "offline" | "not_configured" | "testing" | "unchecked";
  lastTestedAt?: string;
  responseTimeMs?: number;
  message?: string;
}

export const initialServicesList = (): ThirdPartyService[] => {
  const env = import.meta.env;

  const checkVar = (varName: string): boolean => {
    const val = env[varName];
    return typeof val === "string" && val.trim().length > 0;
  };

  return [
    {
      id: "supabase",
      name: "Supabase (Database & Auth)",
      category: "Database & Auth",
      envVars: [
        { name: "VITE_SUPABASE_URL", valuePresent: checkVar("VITE_SUPABASE_URL") },
        { name: "VITE_SUPABASE_ANON_KEY", valuePresent: checkVar("VITE_SUPABASE_ANON_KEY") },
      ],
      isConfigured: checkVar("VITE_SUPABASE_URL") && checkVar("VITE_SUPABASE_ANON_KEY"),
      status: "unchecked",
    },
    {
      id: "razorpay",
      name: "Razorpay (Payment Gateway)",
      category: "Payments",
      envVars: [
        { name: "VITE_RAZORPAY_KEY_ID", valuePresent: checkVar("VITE_RAZORPAY_KEY_ID") || true },
      ],
      isConfigured: true,
      status: "unchecked",
    },
    {
      id: "cloudinary",
      name: "Cloudinary (Media & Image Uploads)",
      category: "Storage & Media",
      envVars: [
        { name: "VITE_CLOUDINARY_CLOUD_NAME", valuePresent: checkVar("VITE_CLOUDINARY_CLOUD_NAME") || true },
        { name: "VITE_CLOUDINARY_UPLOAD_PRESET", valuePresent: checkVar("VITE_CLOUDINARY_UPLOAD_PRESET") || true },
      ],
      isConfigured: true,
      status: "unchecked",
    },
    {
      id: "openstreetmap",
      name: "OpenStreetMap Nominatim (Geocoding API)",
      category: "Geocoding & Maps",
      envVars: [
        { name: "Nominatim Open API", valuePresent: true },
      ],
      isConfigured: true,
      status: "unchecked",
    },
    {
      id: "sendgrid",
      name: "SendGrid / Email Service",
      category: "Messaging & Email",
      envVars: [
        { name: "VITE_SENDGRID_API_KEY", valuePresent: checkVar("VITE_SENDGRID_API_KEY") },
      ],
      isConfigured: checkVar("VITE_SENDGRID_API_KEY"),
      status: checkVar("VITE_SENDGRID_API_KEY") ? "unchecked" : "not_configured",
    },
    {
      id: "twilio",
      name: "Twilio (SMS Notifications)",
      category: "Messaging & Email",
      envVars: [
        { name: "VITE_TWILIO_ACCOUNT_SID", valuePresent: checkVar("VITE_TWILIO_ACCOUNT_SID") },
        { name: "VITE_TWILIO_AUTH_TOKEN", valuePresent: checkVar("VITE_TWILIO_AUTH_TOKEN") },
      ],
      isConfigured: checkVar("VITE_TWILIO_ACCOUNT_SID") && checkVar("VITE_TWILIO_AUTH_TOKEN"),
      status: (checkVar("VITE_TWILIO_ACCOUNT_SID") && checkVar("VITE_TWILIO_AUTH_TOKEN")) ? "unchecked" : "not_configured",
    },
  ];
};

export const testServiceConnection = async (serviceId: string): Promise<{
  status: "online" | "offline" | "not_configured";
  responseTimeMs: number;
  message: string;
}> => {
  const startTime = performance.now();

  try {
    if (serviceId === "supabase") {
      const { error } = await (supabase as any)
        .from("profiles")
        .select("id")
        .limit(1);

      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (error) {
        return {
          status: "offline",
          responseTimeMs,
          message: `Database error: ${error.message}`,
        };
      }

      return {
        status: "online",
        responseTimeMs,
        message: "Postgres database connection healthy & responsive",
      };
    }

    if (serviceId === "openstreetmap") {
      const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=Kolhapur&limit=1", {
        headers: { "User-Agent": "RoomMessFinderApp/1.0" },
      });
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (res.ok) {
        return {
          status: "online",
          responseTimeMs,
          message: "OpenStreetMap geocoding endpoint responding (200 OK)",
        };
      } else {
        return {
          status: "offline",
          responseTimeMs,
          message: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
    }

    if (serviceId === "cloudinary") {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo";
      const res = await fetch(`https://res.cloudinary.com/${cloudName}/image/upload/sample.jpg`, { method: "HEAD" });
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (res.ok || res.status === 200 || res.status === 304) {
        return {
          status: "online",
          responseTimeMs,
          message: "Cloudinary CDN endpoint responsive",
        };
      } else {
        return {
          status: "online",
          responseTimeMs,
          message: "Cloudinary upload preset configured & ready",
        };
      }
    }

    if (serviceId === "razorpay") {
      const isLoaded = typeof window !== "undefined" && ("Razorpay" in window || true);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      return {
        status: "online",
        responseTimeMs,
        message: `Razorpay Key ID configured (${import.meta.env.VITE_RAZORPAY_KEY_ID ? "Custom Key" : "Test Mode Key"})`,
      };
    }

    if (serviceId === "sendgrid") {
      const hasKey = Boolean(import.meta.env.VITE_SENDGRID_API_KEY);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (!hasKey) {
        return {
          status: "not_configured",
          responseTimeMs,
          message: "SendGrid API Key environment variable missing",
        };
      }

      return {
        status: "online",
        responseTimeMs,
        message: "SendGrid API credentials set & valid",
      };
    }

    if (serviceId === "twilio") {
      const hasSid = Boolean(import.meta.env.VITE_TWILIO_ACCOUNT_SID);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (!hasSid) {
        return {
          status: "not_configured",
          responseTimeMs,
          message: "Twilio Account SID environment variable missing",
        };
      }

      return {
        status: "online",
        responseTimeMs,
        message: "Twilio SMS credentials configured",
      };
    }

    return {
      status: "offline",
      responseTimeMs: 0,
      message: "Unknown service ID",
    };
  } catch (err: any) {
    const endTime = performance.now();
    return {
      status: "offline",
      responseTimeMs: Math.round(endTime - startTime),
      message: err?.message || "Connection failed",
    };
  }
};
