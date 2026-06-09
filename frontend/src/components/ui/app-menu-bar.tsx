"use client";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "../../components/ui/menubar";
import {
  Folder,
  FolderPlus,
  FileText,
} from "lucide-react";

export default function AppMenuBar() {
  return (
    <Menubar className="bg-transparent border-none shadow-none rounded-none text-zinc-300">
      <MenubarMenu>
        <MenubarTrigger className="flex items-center gap-2 cursor-pointer data-[state=open]:bg-white/10 data-[state=open]:text-white">
          <Folder className="w-4 h-4" />
          Projects
        </MenubarTrigger>
        <MenubarContent className="w-56 bg-[#09090b] border-white/10 text-white">
          <MenubarItem className="cursor-pointer focus:bg-white/10 focus:text-white">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </MenubarItem>
          <MenubarItem className="cursor-pointer focus:bg-white/10 focus:text-white">
            <FileText className="w-4 h-4 mr-2" />
            All Projects
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
