// Simple in-memory store for IDs of listings created during this session
const createdIds: string[] = [];

export const addCreatedId = (id: string) => {
  createdIds.push(id);
};

export const getCreatedIds = (): string[] => {
  return [...createdIds];
};
