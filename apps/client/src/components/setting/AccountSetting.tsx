import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export default function AccountSetting() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Manage your account preferences here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-muted-foreground text-sm">Coming soon.</div>
      </CardContent>
    </Card>
  );
}
