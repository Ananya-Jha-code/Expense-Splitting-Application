"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserSearchBar({ onSelect }) {
  const [term, setTerm] = useState("");
  const results = useQuery(api.users.search, term ? { term } : "skip");

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <Input
        placeholder="Search users by name, email, or username..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="border-pink-500 focus:ring-pink-500"
      />

      {results?.length > 0 && (
        <div className="space-y-2">
          {results.map((u) => (
            <Card
              key={u._id}
              className="p-3 hover:bg-pink-50 transition cursor-pointer"
              onClick={() => onSelect(u)}
            >
              <p className="font-medium">{u.name || "(No name)"}</p>
              <p className="text-sm text-gray-600">{u.email}</p>
              {u.username && <p className="text-sm text-gray-500">@{u.username}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}