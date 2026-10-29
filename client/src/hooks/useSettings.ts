import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSettings } from '../types/index.ts';
import { fetchSettings, patchSettings } from '../lib/api.ts';
import { DEFAULT_SETTINGS } from '../lib/settings.ts';

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const { mutate } = useMutation({
    mutationFn: patchSettings,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const prev = queryClient.getQueryData<UserSettings>(['settings']);
      queryClient.setQueryData(['settings'], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['settings'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const update = (patch: Partial<UserSettings>) => mutate({ ...settings, ...patch });

  return { settings, update };
}
