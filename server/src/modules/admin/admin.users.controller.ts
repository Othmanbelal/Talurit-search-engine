import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  inviteUserSchema,
  sendTestEmailSchema,
  updateSettingsSchema,
  updateUserSchema,
} from "./admin.schemas";
import {
  getAdminSettings,
  sendAdminTestEmail,
  updateAdminSettings,
} from "./admin.settings.service";
import {
  cancelInvitation,
  getAdminInvitations,
  getAdminUsersOverview,
  inviteUser,
  resendInvitation,
  updateUserByAdmin,
} from "./admin.users.service";

export async function adminUsersController(_request: Request, response: Response) {
  const overview = await getAdminUsersOverview();

  return response.json(successResponse(overview));
}

export async function inviteUserController(request: Request, response: Response) {
  const input = inviteUserSchema.parse(request.body);
  const invitation = await inviteUser(input, request.user!.id);

  return response.status(201).json(successResponse({ invitation }));
}

export async function invitationsController(_request: Request, response: Response) {
  const invitations = await getAdminInvitations();

  return response.json(successResponse({ invitations }));
}

export async function resendInvitationController(request: Request, response: Response) {
  const invitation = await resendInvitation(request.params.id);

  return response.json(successResponse({ invitation }));
}

export async function cancelInvitationController(request: Request, response: Response) {
  const invitation = await cancelInvitation(request.params.id);

  return response.json(successResponse({ invitation }));
}

export async function updateUserController(request: Request, response: Response) {
  const input = updateUserSchema.parse(request.body);
  const user = await updateUserByAdmin(request.params.id, input, request.user!.id);

  return response.json(successResponse({ user }));
}

export async function adminSettingsController(_request: Request, response: Response) {
  const settings = await getAdminSettings();

  return response.json(successResponse({ settings }));
}

export async function updateAdminSettingsController(request: Request, response: Response) {
  const input = updateSettingsSchema.parse(request.body);
  const settings = await updateAdminSettings(input);

  return response.json(successResponse({ settings }));
}

export async function sendTestEmailController(request: Request, response: Response) {
  const input = sendTestEmailSchema.parse(request.body);
  const result = await sendAdminTestEmail(input);

  return response.json(successResponse(result));
}
