// Filter groups. Group names live in code; the options inside each group are CMS entries
// ("Filter options" in Studio). Add a group here, then add options for it in Studio.
export const TEACHER_GROUPS = [
  { key: 'teacherGrade', label: 'Grade' },
  { key: 'teacherMinutes', label: 'Minutes' },
  { key: 'teacherFeel', label: 'Feels like' },
] as const

export const PARENT_GROUPS = [
  { key: 'parentAge', label: 'Age' },
  { key: 'parentWhen', label: 'When' },
  { key: 'parentFeel', label: 'Feels like' },
  { key: 'parentAlso', label: 'Also' },
] as const

export const ALL_GROUPS = [
  ...TEACHER_GROUPS.map((g) => ({ value: g.key, title: `Teachers · ${g.label}` })),
  ...PARENT_GROUPS.map((g) => ({ value: g.key, title: `Parents · ${g.label}` })),
]
