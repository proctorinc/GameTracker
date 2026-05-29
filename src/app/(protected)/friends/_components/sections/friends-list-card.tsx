"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  sectionActionToneClassName,
  sectionItemClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function FriendsListCard() {
  const {
    data,
    isPending,
    setFriendToRemove,
    showAllFriends,
    toggleShowAllFriends,
    visibleFriends,
  } = useFriendsPage();
  const { friends } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Friends</CardTitle>
        {friends.length > 3 ? (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className={sectionActionToneClassName}
              onClick={toggleShowAllFriends}
            >
              Show all
              <ChevronDown
                className={`transition-transform ${showAllFriends ? "rotate-180" : ""}`}
              />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <CardEmpty>No friends yet</CardEmpty>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleFriends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center gap-3 ${sectionItemClassName}`}
              >
                <ProfilePicture user={friend} size="sm" linkToProfile />
                <div className="min-w-0 flex-1">
                  <p className={sectionItemTitleClassName}>
                    {getDisplayName(friend)}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => setFriendToRemove(friend)}
                >
                  <Trash2 />
                  <span className="sr-only">Remove friend</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
