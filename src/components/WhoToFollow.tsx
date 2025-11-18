import { getRandomUsers } from "@/actions/user.action";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import FollowButton from "./FollowButton";
import { UserAvatar } from "./ui/avatar";

async function WhoToFollow() {
  const users = await getRandomUsers();
  if (!users.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who to Follow</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${user.username}`}>
                  <UserAvatar src={user.clerkImage} fallback="/avatar.png" />
                </Link>

                <div className="text-xs">
                  <Link href={`/profile/${user.username}`} className="font-medium">
                    {user.name}
                  </Link>
                  <p className="text-muted-foreground">@{user.username}</p>
                  <p className="text-muted-foreground">{user._count.followers} followers</p>
                </div>
              </div>

              <FollowButton userId={user.id} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default WhoToFollow;
