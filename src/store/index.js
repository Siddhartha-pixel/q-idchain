import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Identity ──────────────────────────────────────────────────────────
      identity: null,
      isAuthed: false,
      totpSecret: null,
      backupCodes: [],
      setIdentity: (id, totp, codes) => set({ identity: id, isAuthed: true, totpSecret: totp, backupCodes: codes || [] }),
      logout: () => set({ identity: null, isAuthed: false }),

      // ── Contacts ──────────────────────────────────────────────────────────
      contacts: [],
      addContact:    (c) => set(s => ({ contacts: [...s.contacts.filter(x => x.did !== c.did), { ...c, id: c.did, addedAt: Date.now() }] })),
      removeContact: (did) => set(s => ({ contacts: s.contacts.filter(c => c.did !== did) })),
      updateContact: (did, u) => set(s => ({ contacts: s.contacts.map(c => c.did === did ? { ...c, ...u } : c) })),

      // ── Direct Messages ───────────────────────────────────────────────────
      // conversations: { peerDID: [msg, ...] }
      conversations: {},
      addDirectMsg: (peerDID, msg) => set(s => ({
        conversations: { ...s.conversations, [peerDID]: [...(s.conversations[peerDID] || []), msg] }
      })),
      markConvoRead: (peerDID) => set(s => ({
        conversations: {
          ...s.conversations,
          [peerDID]: (s.conversations[peerDID] || []).map(m => ({ ...m, read: true }))
        }
      })),
      getUnread: (peerDID) => {
        const id = get().identity?.did
        return (get().conversations[peerDID] || []).filter(m => !m.read && m.from !== id).length
      },

      // ── Groups ────────────────────────────────────────────────────────────
      groups: [],
      groupMessages: {}, // { groupId: [msg, ...] }
      addGroup:     (g)  => set(s => ({ groups: [...s.groups, g] })),
      updateGroup:  (id, u) => set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...u } : g) })),
      addGroupMsg:  (gid, msg) => set(s => ({
        groupMessages: { ...s.groupMessages, [gid]: [...(s.groupMessages[gid] || []), msg] }
      })),

      // ── Files ─────────────────────────────────────────────────────────────
      sharedFiles: [],
      addFile: (f) => set(s => ({ sharedFiles: [f, ...s.sharedFiles] })),

      // ── Encryption Inspector ──────────────────────────────────────────────
      inspectedMsg: null,
      setInspected: (msg) => set({ inspectedMsg: msg }),
      clearInspected: () => set({ inspectedMsg: null }),

      // ── Settings ──────────────────────────────────────────────────────────
      settings: {
        notifications: true,
        showEncDetails: true,
        disappearAfter: null,
        quantumAlgorithm: 'Kyber-768',
        theme: 'dark',
      },
      updateSettings: (u) => set(s => ({ settings: { ...s.settings, ...u } })),

      // ── Notifications ─────────────────────────────────────────────────────
      notifications: [],
      addNotif: (n) => set(s => ({
        notifications: [{ ...n, id: crypto.randomUUID(), at: Date.now(), read: false }, ...s.notifications].slice(0, 60)
      })),
      clearNotifs: () => set({ notifications: [] }),
      markNotifRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
    }),
    {
      name: 'qidchain-v1',
      partialize: s => ({
        identity: s.identity, totpSecret: s.totpSecret, backupCodes: s.backupCodes,
        contacts: s.contacts, conversations: s.conversations,
        groups: s.groups, groupMessages: s.groupMessages,
        sharedFiles: s.sharedFiles, settings: s.settings,
      }),
    }
  )
)
