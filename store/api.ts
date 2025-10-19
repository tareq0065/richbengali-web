import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  User,
  AuthResponse,
  NotificationItem,
  Message,
  CreditState,
  SubscriptionState,
  CheckoutRequest,
  Me,
  UserPhoto,
} from "@/lib/types";
import { getToken, getUserIdFromToken } from "@/lib/auth";

const selectNotificationsArg = (state: any): string | null => {
  const stateUserId = state?.auth?.user?.id ?? null;
  const token = getToken();
  const fallbackUserId = token ? getUserIdFromToken(token) : null;
  return stateUserId ?? fallbackUserId;
};

export const api = createApi({
  // keepUnusedDataFor: 0,
  // refetchOnFocus: true,
  refetchOnReconnect: true,
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "User",
    "Users",
    "Me",
    "Notifications",
    "Messages",
    "Credits",
    "Subscription",
    "Favorites",
    "RelationStatus",
  ],
  endpoints: (builder) => ({
    getRef: builder.query<{ data: Array<{ slug: string; label: string }> }, string>({
      query: (type) => `/refs/${type}`,
    }),
    /* ----------------------- Auth ----------------------- */
    register: builder.mutation<AuthResponse, Partial<User> & { email: string; password: string }>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    updateFcm: builder.mutation<{ ok: boolean }, { token: string }>({
      query: (body) => ({ url: "/users/me/fcm", method: "POST", body }),
    }),

    /* ----------------------- Me (merged users + profile + photos) ----------------------- */
    getMe: builder.query<{ success: boolean; data: Me }, void>({
      query: () => ({ url: "/users/me" }),
      providesTags: ["Me"],
    }),
    getMyAvatar: builder.query<{ url: string | null }, void>({
      query: () => "/users/me",
      transformResponse: (resp: any) => ({
        url: resp?.data?.profile_picture_url ?? null,
      }),
      providesTags: ["Me"], // reuse existing tag if you have it
    }),
    updateMe: builder.mutation<{ success: boolean; data: Me }, Partial<Me>>({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),

    /* ----------------------- Photos (gallery) ----------------------- */
    uploadPhoto: builder.mutation<{ success: boolean; data: UserPhoto }, File>({
      query: (file) => {
        const form = new FormData();
        form.append("file", file);
        return { url: "/users/me/photos", method: "POST", body: form };
      },
      invalidatesTags: ["Me"],
    }),

    deletePhoto: builder.mutation<{ success: boolean }, string>({
      query: (photoId) => ({ url: `/users/me/photos/${photoId}`, method: "DELETE" }),
      invalidatesTags: ["Me"],
    }),

    setPrimaryPhoto: builder.mutation<{ success: boolean }, string>({
      query: (photoId) => ({ url: `/users/me/photos/${photoId}/primary`, method: "PATCH" }),
      invalidatesTags: ["Me"],
    }),

    reorderPhotos: builder.mutation<{ success: boolean }, string[]>({
      query: (order) => ({ url: "/users/me/photos/reorder", method: "PATCH", body: { order } }),
      invalidatesTags: ["Me"],
    }),

    /* ----------------------- Users / Relations ----------------------- */
    listUsers: builder.query<
      User[],
      { cityStartsWith?: string; minAge?: number; maxAge?: number } | void
    >({
      query: (params) => ({ url: "/users", params: params as any }),
      providesTags: ["Users"],
      transformResponse: (r: any) => r.data as User[],
    }),
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_res, _err, id) => [{ type: "User", id }],
      transformResponse: (r: any) => r.data as User,
    }),

    relationStatus: builder.query<
      {
        target_id: string;
        is_liked: boolean;
        is_favorited: boolean;
        is_superliked: boolean;
        liked_me: boolean;
        favorited_me: boolean;
        superliked_me: boolean;
        visited?: boolean;
        visited_me?: boolean;
        last_visit_at?: string | null;
        last_visited_me_at?: string | null;
      },
      string
    >({
      query: (targetId) => `/relations/status/${targetId}`,
      transformResponse: (r: any) => r.data,
      providesTags: (_res, _err, id) => [{ type: "RelationStatus", id }],
    }),
    like: builder.mutation<{ ok: boolean }, { targetId: string }>({
      query: ({ targetId }) => ({ url: `/relations/${targetId}/like`, method: "POST" }),
      async onQueryStarted({ targetId }, { dispatch, getState, queryFulfilled }) {
        // Optimistically flip relationStatus
        const patchStatus = dispatch(
          api.util.updateQueryData("relationStatus", targetId, (draft: any) => {
            draft.is_liked = true;
            draft.liked_me ??= draft.liked_me ?? false;
          }),
        );
        // Optionally reflect on getUser (if you show these flags there)
        const patchUser = dispatch(
          api.util.updateQueryData("getUser", targetId, (u: any) => {
            u.is_liked = true;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchStatus.undo();
          patchUser.undo();
        }
      },
      invalidatesTags: (_res, _err, { targetId }) => [{ type: "RelationStatus", id: targetId }],
    }),

    // --- Unlike ---
    unlike: builder.mutation<{ ok: boolean; removed: boolean }, { targetId: string }>({
      query: ({ targetId }) => ({ url: `/relations/${targetId}/like`, method: "DELETE" }),
      async onQueryStarted({ targetId }, { dispatch, queryFulfilled }) {
        const patchStatus = dispatch(
          api.util.updateQueryData("relationStatus", targetId, (draft: any) => {
            draft.is_liked = false;
          }),
        );
        const patchUser = dispatch(
          api.util.updateQueryData("getUser", targetId, (u: any) => {
            u.is_liked = false;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchStatus.undo();
          patchUser.undo();
        }
      },
      invalidatesTags: (_res, _err, { targetId }) => [{ type: "RelationStatus", id: targetId }],
    }),

    // --- Favorite ---
    favorite: builder.mutation<{ ok: boolean }, { targetId: string }>({
      query: ({ targetId }) => ({ url: `/relations/${targetId}/favorite`, method: "POST" }),
      async onQueryStarted({ targetId }, { dispatch, getState, queryFulfilled }) {
        const patchStatus = dispatch(
          api.util.updateQueryData("relationStatus", targetId, (draft: any) => {
            draft.is_favorited = true;
          }),
        );
        const patchUser = dispatch(
          api.util.updateQueryData("getUser", targetId, (u: any) => {
            u.is_favorited = true;
          }),
        );
        // If you show a "Favorites" list, optimistically add this user there too
        const patchFavList = dispatch(
          api.util.updateQueryData("favorites", undefined, (list: any[]) => {
            // Avoid duplicates; you only have the id here, so keep it simple
            if (!list?.some((x) => x?.id === targetId)) list.unshift({ id: targetId });
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchStatus.undo();
          patchUser.undo();
          patchFavList.undo();
        }
      },
      invalidatesTags: (_res, _err, { targetId }) => [{ type: "RelationStatus", id: targetId }],
    }),

    // --- Unfavorite ---
    unfavorite: builder.mutation<{ ok: boolean; removed: boolean }, { targetId: string }>({
      query: ({ targetId }) => ({ url: `/relations/${targetId}/favorite`, method: "DELETE" }),
      async onQueryStarted({ targetId }, { dispatch, queryFulfilled }) {
        const patchStatus = dispatch(
          api.util.updateQueryData("relationStatus", targetId, (draft: any) => {
            draft.is_favorited = false;
          }),
        );
        const patchUser = dispatch(
          api.util.updateQueryData("getUser", targetId, (u: any) => {
            u.is_favorited = false;
          }),
        );
        const patchFavList = dispatch(
          api.util.updateQueryData("favorites", undefined, (list: any[]) => {
            const i = list?.findIndex((x) => x?.id === targetId);
            if (i > -1) list.splice(i, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchStatus.undo();
          patchUser.undo();
          patchFavList.undo();
        }
      },
      invalidatesTags: (_res, _err, { targetId }) => [{ type: "RelationStatus", id: targetId }],
    }),

    // --- Superlike (set both superlike & like; also decrement credits locally) ---
    superlike: builder.mutation<{ ok: boolean }, { targetId: string }>({
      query: ({ targetId }) => ({ url: `/relations/${targetId}/superlike`, method: "POST" }),
      async onQueryStarted({ targetId }, { dispatch, queryFulfilled }) {
        const patchStatus = dispatch(
          api.util.updateQueryData("relationStatus", targetId, (draft: any) => {
            draft.is_superliked = true;
            draft.is_liked = true;
          }),
        );
        const patchUser = dispatch(
          api.util.updateQueryData("getUser", targetId, (u: any) => {
            u.is_superliked = true;
            u.is_liked = true;
          }),
        );
        const patchCredits = dispatch(
          api.util.updateQueryData("credits", undefined, (c: any) => {
            if (typeof c?.superlike_credits === "number" && c.superlike_credits > 0) {
              c.superlike_credits -= 1;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchStatus.undo();
          patchUser.undo();
          patchCredits.undo();
        }
      },
    }),

    favorites: builder.query<User[], void>({
      query: () => `/relations/favorites`,
      providesTags: ["Favorites"],
      transformResponse: (r: any) => r.data as User[],
    }),

    visit: builder.mutation<{ ok: boolean }, { targetId: string }>({
      query: (body) => ({ url: "/visits", method: "POST", body }),
    }),

    visitors: builder.query<User[], void>({
      query: () => `/relations/visitors`,
      providesTags: ["Users"],
      transformResponse: (r: any) => r.data as User[],
    }),
    visited: builder.query<User[], void>({
      query: () => `/relations/visits`,
      providesTags: ["Users"],
      transformResponse: (r: any) => r.data as User[],
    }),

    /* ----------------------- Notifications ----------------------- */
    notifications: builder.query<NotificationItem[], string | null>({
      query: () => `/notifications`,
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}|${queryArgs ?? "anon"}`,
      providesTags: (_res, _err, userId) => [
        { type: "Notifications" as const, id: userId ?? "anon" },
      ],
      transformResponse: (r: any) => r.data as NotificationItem[],
    }),

    markNotificationRead: builder.mutation<{ ok: boolean; updated: number }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const arg = selectNotificationsArg(getState());
        const patch = dispatch(
          api.util.updateQueryData("notifications", arg, (draft: NotificationItem[]) => {
            const n = draft.find((d) => d.id === id);
            if (n && !n.is_read) {
              n.is_read = true;
              (n as any).read_at = new Date().toISOString();
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    markAllNotificationsRead: builder.mutation<{ ok: boolean; updated: number }, void>({
      query: () => ({ url: `/notifications/read-all`, method: "POST" }),
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const arg = selectNotificationsArg(getState());
        const now = new Date().toISOString();
        const patch = dispatch(
          api.util.updateQueryData("notifications", arg, (draft: NotificationItem[]) => {
            draft.forEach((d) => {
              if (!d.is_read) {
                d.is_read = true;
                (d as any).read_at = now;
              }
            });
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    /* ----------------------- Messages ----------------------- */
    getMessagesWith: builder.query<Message[], string>({
      query: (otherUserId) => `/messages/${otherUserId}`,
      providesTags: (_res, _err, id) => [{ type: "Messages", id }],
      transformResponse: (r: any) => r.data as Message[],
    }),

    conversations: builder.query<User[], void>({
      query: () => `/messages`,
      transformResponse: (r: any) => r.data as User[],
    }),
    sendMessageHttp: builder.mutation<{ data: any }, { to: string; content: string }>({
      query: (body) => ({ url: `/messages`, method: "POST", body }),
    }),

    /* ----------------------- Credits / Billing ----------------------- */
    credits: builder.query<CreditState, void>({
      query: () => `/credits`,
      providesTags: ["Credits"],
      transformResponse: (r: any) => r.data as CreditState,
    }),
    subscription: builder.query<SubscriptionState, void>({
      query: () => `/subscription`,
      providesTags: ["Subscription"],
      transformResponse: (r: any) => (r.data || { status: "none" }) as SubscriptionState,
    }),
    cancelSubscription: builder.mutation<any, { enable?: boolean } | void>({
      query: (body) => ({
        url: "/subscription/cancel",
        method: "POST",
        body: body ?? {},
      }),
    }),
    plans: builder.query<any[], void>({
      query: () => `/subscription/plans`,
      transformResponse: (r: any) => r.data as any[],
    }),
    checkout: builder.mutation<{ url: string }, CheckoutRequest>({
      query: (body) => ({ url: "/stripe/checkout", method: "POST", body }),
    }),
  }),
});

export const {
  useGetRefQuery,

  useRegisterMutation,
  useLoginMutation,
  useUpdateFcmMutation,
  useListUsersQuery,

  // unified Me
  useGetMeQuery,
  useGetMyAvatarQuery,
  useUpdateMeMutation,

  // photos
  useUploadPhotoMutation,
  useDeletePhotoMutation,
  useSetPrimaryPhotoMutation,
  useReorderPhotosMutation,
  useGetUserQuery,

  useRelationStatusQuery,
  useLikeMutation,
  useUnlikeMutation,
  useFavoriteMutation,
  useUnfavoriteMutation,
  useSuperlikeMutation,
  useFavoritesQuery,

  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetMessagesWithQuery,
  useConversationsQuery,
  useSendMessageHttpMutation,
  useCreditsQuery,
  useSubscriptionQuery,
  useCancelSubscriptionMutation,
  usePlansQuery,
  useCheckoutMutation,
  useVisitMutation,
} = api;
