import { useCallback, useEffect, useState } from "react";
import {
  cancelInvitationRequest,
  getAdminUsersRequest,
  inviteUserRequest,
  resendInvitationRequest,
  updateAdminUserRequest,
} from "../services/admin.service";
import type {
  AdminUsersOverview,
  InviteUserPayload,
  UpdateUserPayload,
} from "../types/admin";

export function useAdminUsers() {
  const [data, setData] = useState<AdminUsersOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getAdminUsersRequest()
      .then((overview) => {
        if (isMounted) {
          setData(overview);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Users unavailable");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  const inviteUser = useCallback(
    async (payload: InviteUserPayload) => {
      try {
        const result = await inviteUserRequest(payload);
        return result.invitation;
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const resendInvitation = useCallback(
    async (id: string) => {
      try {
        const result = await resendInvitationRequest(id);
        return result.invitation;
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const cancelInvitation = useCallback(
    async (id: string) => {
      const result = await cancelInvitationRequest(id);
      refresh();
      return result.invitation;
    },
    [refresh],
  );

  const updateUser = useCallback(
    async (id: string, payload: UpdateUserPayload) => {
      const result = await updateAdminUserRequest(id, payload);
      refresh();
      return result.user;
    },
    [refresh],
  );

  return {
    cancelInvitation,
    data,
    error,
    inviteUser,
    isLoading,
    resendInvitation,
    updateUser,
  };
}
