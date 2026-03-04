import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    Send,
    CloudUpload,
    User,
    UserPlus,
    LogOut,
    ChevronsUpDown,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';

// ─── Nav config per role ──────────────────────────────────────────────────────

type NavItem = {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
};

type RoleConfig = {
    title: string;
    subtitle: string;
    accentLetter: string;
    groups: { title: string; items: NavItem[] }[];
};

const roleConfigs: Record<'ADMIN' | 'HR' | 'VOLUNTEER', RoleConfig> = {
    ADMIN: {
        title: 'Admin Control',
        subtitle: 'System Administrator',
        accentLetter: 'A',
        groups: [
            {
                title: 'Overview',
                items: [
                    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
                ],
            },
            {
                title: 'Management',
                items: [
                    { label: 'HR Management', icon: UserCheck, href: '/admin/hrs' },
                    { label: 'Volunteers', icon: Users, href: '/admin/volunteers' },
                    { label: 'Students', icon: User, href: '/admin/students' },
                ],
            },
            {
                title: 'Operations',
                items: [
                    { label: 'Student Transfer', icon: Send, href: '/admin/transfer' },
                    { label: 'Bulk Imports', icon: CloudUpload, href: '/admin/uploads' },
                ],
            },
        ],
    },
    HR: {
        title: 'HR Executive',
        subtitle: 'Lead Interviewer',
        accentLetter: 'H',
        groups: [
            {
                title: 'Overview',
                items: [
                    { label: 'Control Hub', icon: LayoutDashboard, href: '/hr' },
                ],
            },
            {
                title: 'Candidates',
                items: [
                    { label: 'Candidate Pool', icon: Users, href: '/hr/students' },
                ],
            },
        ],
    },
    VOLUNTEER: {
        title: 'Support Node',
        subtitle: 'Volunteer',
        accentLetter: 'V',
        groups: [
            {
                title: 'Overview',
                items: [
                    { label: 'Dashboard', icon: LayoutDashboard, href: '/volunteer' },
                ],
            },
            {
                title: 'Registration',
                items: [
                    { label: 'New Registration', icon: UserPlus, href: '/volunteer/enroll' },
                ],
            },
        ],
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    role: 'ADMIN' | 'HR' | 'VOLUNTEER';
}

export function AppSidebar({ role, ...props }: AppSidebarProps) {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const config = roleConfigs[role];

    const initials = (user?.name || user?.username || role)
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <Sidebar variant="sidebar" {...props}>
            {/* ── Header ── */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#1e3a8a] text-white font-black text-sm shadow">
                                    {config.accentLetter}
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-bold">{config.title}</span>
                                    <span className="truncate text-xs text-muted-foreground">{config.subtitle}</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* ── Nav groups ── */}
            <SidebarContent>
                {config.groups.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        location.pathname === item.href ||
                                        (item.href !== '/admin' &&
                                            item.href !== '/hr' &&
                                            item.href !== '/volunteer' &&
                                            location.pathname.startsWith(item.href));
                                    return (
                                        <SidebarMenuItem key={item.label}>
                                            <SidebarMenuButton asChild isActive={isActive}>
                                                <Link to={item.href}>
                                                    <Icon className="size-4" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* ── Footer: user dropdown ── */}
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="size-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-[#1e3a8a] text-white text-xs font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">
                                            {user?.name || user?.username || 'User'}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground capitalize">
                                            {role.toLowerCase()}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-48 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-[#1e3a8a] text-white text-xs font-bold">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid text-left text-sm leading-tight">
                                            <span className="truncate font-medium">
                                                {user?.name || user?.username}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground capitalize">
                                                {role.toLowerCase()}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 size-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
