import type { ProfileValues } from "../schemas/profile.schema"

type ProfileEditableField = Exclude<keyof ProfileValues, "avatarUrl" | "email">

const PERSONAL_PROFILE_FIELDS = ["bio", "birthDate", "name", "phone"] as const satisfies readonly ProfileEditableField[]
const ADDRESS_PROFILE_FIELDS = ["city", "country", "state", "street", "zipCode"] as const satisfies readonly ProfileEditableField[]
const PREFERENCE_PROFILE_FIELDS = ["locale", "timezone"] as const satisfies readonly ProfileEditableField[]

type ProfileAccountField = (typeof ADDRESS_PROFILE_FIELDS)[number] | (typeof PERSONAL_PROFILE_FIELDS)[number]

export { ADDRESS_PROFILE_FIELDS, PERSONAL_PROFILE_FIELDS, PREFERENCE_PROFILE_FIELDS }
export type { ProfileAccountField, ProfileEditableField }
