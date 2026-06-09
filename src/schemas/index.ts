// Auth schemas
export { registerSchema, type RegisterInput } from './auth/register';
export { loginSchema, type LoginInput } from './auth/login';
export { refreshSchema, type RefreshInput } from './auth/refresh';
export { logoutSchema, type LogoutInput } from './auth/logout';

// Bot schemas
export { createBotSchema, type CreateBotInput } from './bots/create';
export { updateBotSchema, type UpdateBotInput } from './bots/update';

// Lead schemas
export { createLeadSchema, type CreateLeadInput } from './leads/create';
export { updateLeadSchema, type UpdateLeadInput } from './leads/update';

// Message schemas
export { sendMessageSchema, type SendMessageInput } from './messages/send';
export { uploadMediaSchema, type UploadMediaInput, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './messages/media';

// Credential schemas
export { createCredentialSchema, type CreateCredentialInput, VALID_PROVIDER_LIST } from './credentials/create';
export { updateCredentialSchema, type UpdateCredentialInput } from './credentials/update';
