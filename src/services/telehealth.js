import { base44 } from "@/api/base44Client";
import { getFeatureAvailability, isFeatureAvailable } from "@/services/availability";

export async function listTelehealthDoctors() {
  return base44.entities.TelehealthDoctor.list("-created_date", 50);
}

export async function listTelehealthAppointments(userEmail) {
  if (!userEmail) {
    return [];
  }

  return base44.entities.TelehealthAppointment.filter(
    { user_email: userEmail },
    "-scheduled_at",
    30
  );
}

export function getTelehealthBookingAvailability() {
  return getFeatureAvailability("telehealthBooking");
}

export async function createTelehealthDoctor(payload) {
  return base44.entities.TelehealthDoctor.create(payload);
}

export async function cancelTelehealthAppointment(appointmentId) {
  return base44.entities.TelehealthAppointment.update(appointmentId, {
    status: "cancelled",
  });
}

export async function bookTelehealthAppointment(payload) {
  if (!isFeatureAvailable("telehealthBooking")) {
    throw new Error(getTelehealthBookingAvailability().reason);
  }

  return base44.entities.TelehealthAppointment.create(payload);
}
