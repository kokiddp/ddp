import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const {
  mockJoinVoice,
  mockLeaveVoice,
  mockToggleMicrophone,
  mockToggleSpeaker,
  mockGetVoiceParticipants,
  mockListAudioInputDevices,
  mockListAudioOutputDevices,
  mockSetAudioInputDevice,
  mockSetAudioOutputDevice,
  mockStartAudioLevelMonitor,
} = vi.hoisted(() => ({
  mockJoinVoice: vi.fn(),
  mockLeaveVoice: vi.fn(),
  mockToggleMicrophone: vi.fn(),
  mockToggleSpeaker: vi.fn(),
  mockGetVoiceParticipants: vi.fn(),
  mockListAudioInputDevices: vi.fn(),
  mockListAudioOutputDevices: vi.fn(),
  mockSetAudioInputDevice: vi.fn(),
  mockSetAudioOutputDevice: vi.fn(),
  mockStartAudioLevelMonitor: vi.fn(),
}));

vi.mock('../../apps/web/src/services/voice.service.js', () => ({
  joinVoice: mockJoinVoice,
  leaveVoice: mockLeaveVoice,
  toggleMicrophone: mockToggleMicrophone,
  toggleSpeaker: mockToggleSpeaker,
  getVoiceParticipants: mockGetVoiceParticipants,
  listAudioInputDevices: mockListAudioInputDevices,
  listAudioOutputDevices: mockListAudioOutputDevices,
  setAudioInputDevice: mockSetAudioInputDevice,
  setAudioOutputDevice: mockSetAudioOutputDevice,
  startAudioLevelMonitor: mockStartAudioLevelMonitor,
}));

import { useVoiceChatStore } from '../../apps/web/src/stores/useVoiceChatStore.js';

describe('useVoiceChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockStartAudioLevelMonitor.mockReturnValue(() => undefined);
    mockListAudioInputDevices.mockResolvedValue([]);
    mockListAudioOutputDevices.mockResolvedValue([]);
  });

  it('maps microphone permission denial to user-friendly error', async () => {
    const store = useVoiceChatStore();

    mockToggleMicrophone.mockRejectedValueOnce({
      name: 'NotAllowedError',
      message: 'Permission denied',
    });

    await store.setMicrophoneEnabled(true);

    expect(store.microphoneEnabled).toBe(false);
    expect(store.error).toContain('Microphone permission denied');
  });
});
