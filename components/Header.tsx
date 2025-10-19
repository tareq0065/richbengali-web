"use client";
import Link from "next/link";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Avatar } from "@heroui/react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { LogIn, Home as HomeIcon, Heart, MessageCircle, Crown, User } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { getToken } from "@/lib/auth";
import { useGetMyAvatarQuery } from "@/store/api";

function TabItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs",
        active ? "text-primary-600 font-medium" : "text-gray-500",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <div className={["rounded-full p-1", active ? "bg-primary-50" : "bg-transparent"].join(" ")}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const authed = typeof window !== "undefined" && !!getToken();

  const { data: avatarData } = useGetMyAvatarQuery(undefined, {
    skip: !authed,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const avatarUrl = avatarData?.url || undefined;

  const active = useMemo(() => {
    const p = pathname || "/";
    return {
      home: p === "/" || p.startsWith("/home"),
      favorites: p.startsWith("/favorites"),
      chats: p.startsWith("/chats"),
      subscription: p.startsWith("/subscription"),
      me: p.startsWith("/me"),
    };
  }, [pathname]);

  return (
    <>
      <Navbar isBordered className="px-4">
        <NavbarBrand className="gap-2">
          <Link href="/home" className="text-xl font-bold">
            <img src="/logo.svg" alt="logo" className="h-6" />
          </Link>
        </NavbarBrand>

        {/* DESKTOP LINKS (unchanged) */}
        {authed && (
          <NavbarContent className="hidden md:flex gap-4" justify="start">
            <NavbarItem>
              <Link href="/home">Home</Link>
            </NavbarItem>
            <NavbarItem>
              <Link href="/favorites">Favorites</Link>
            </NavbarItem>
            <NavbarItem>
              <Link href="/chats">Chats</Link>
            </NavbarItem>
            <NavbarItem>
              <Link href="/subscription">Subscription</Link>
            </NavbarItem>
          </NavbarContent>
        )}

        <NavbarContent justify="end" className="gap-3">
          {authed && (
            <NavbarItem>
              <NotificationBell />
            </NavbarItem>
          )}

          {authed && (
            <NavbarItem className="hidden md:flex">
              <Link href="/me">
                <Avatar
                  size="sm"
                  src={avatarUrl}
                  icon={!avatarUrl ? <User size={16} /> : undefined}
                  classNames={{ img: "object-cover object-center" }}
                />
              </Link>
            </NavbarItem>
          )}

          {!authed && (
            <NavbarItem>
              <Button
                as={Link}
                href="/"
                size="sm"
                color="primary"
                variant="flat"
                startContent={<LogIn size={14} />}
              >
                Login
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>

      {/* MOBILE BOTTOM TABS (only visible on mobile) */}
      {authed && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto max-w-md flex items-center justify-between">
            <TabItem href="/home" active={active.home} icon={<HomeIcon size={20} />} label="Home" />
            <TabItem
              href="/favorites"
              active={active.favorites}
              icon={<Heart size={20} />}
              label="Favorites"
            />
            <TabItem
              href="/chats"
              active={active.chats}
              icon={<MessageCircle size={20} />}
              label="Chats"
            />
            <TabItem
              href="/subscription"
              active={active.subscription}
              icon={<Crown size={20} />}
              label="Plans"
            />
            <Link
              href="/me"
              className={[
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs",
                active.me ? "text-primary-600 font-medium" : "text-gray-500",
              ].join(" ")}
              aria-current={active.me ? "page" : undefined}
            >
              <div
                className={[
                  "rounded-full",
                  active.me ? "ring-2 ring-primary-500 ring-offset-2" : "",
                ].join(" ")}
              >
                <Avatar
                  size="sm"
                  src={avatarUrl}
                  icon={!avatarUrl ? <User size={16} /> : undefined}
                  classNames={{ img: "object-cover object-center" }}
                />
              </div>
              <span>Me</span>
            </Link>
          </div>
          <div className="h-2" />
        </nav>
      )}
    </>
  );
}
