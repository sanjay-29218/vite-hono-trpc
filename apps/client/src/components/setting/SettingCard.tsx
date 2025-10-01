"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ApiKeySetting from "./ApiKeySetting";
import AccountSetting from "./AccountSetting";

export default function SettingCard() {
  return (
    <Tabs defaultValue="api" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="api">API Keys</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="api" className="mt-4">
        <ApiKeySetting />
      </TabsContent>

      <TabsContent value="account" className="mt-4">
        <AccountSetting />
      </TabsContent>
    </Tabs>
  );
}
