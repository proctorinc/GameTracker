export type ProfileOverviewUser = {
  id: string;
  role: "user" | "admin";
  firstName: string | null;
  lastName: string | null;
  color: string;
  phoneNumber: string | null;
  createdAt: string | null;
};

export type ProfileOverviewPageData = {
  user: ProfileOverviewUser;
};
