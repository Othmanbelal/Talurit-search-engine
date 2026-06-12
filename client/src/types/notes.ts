export type NoteAuthor = {
  id: string;
  name: string;
  role: string;
  profile: { profilePictureUrl: string | null } | null;
};

export type ItemNote = {
  id: string;
  stockBalanceId: string;
  content: string;
  createdAt: string;
  author: NoteAuthor;
};

export type RecentNote = ItemNote & {
  stockBalance: {
    id: string;
    inventoryTableId: string | null;
    inventoryTable: { id: string; name: string } | null;
    item: { name: string };
  };
};
