/** Wording shown to the player for states that the systems track. Kept apart from the logic so it is easy to revise. */
export const MEMORY_STATUS_TEXT = {
  held: "This is what Daniel remembers.",
  doubted: "Something does not fit.",
  refuted: "The evidence says otherwise.",
} as const;

export const KIND_LABEL = {
  document: "Document",
  photograph: "Photograph",
  object: "Object",
  recording: "Recording",
  drawing: "Drawing",
} as const;

export const END_OF_PHASE_3 = {
  title: "END OF PHASE 3",
  body: "You have the shape of the evening. An hour of it is still missing, and one door is still shut. What happens next is not built yet.",
};
