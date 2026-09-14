import { useEffect, useState } from 'react';
import { useSession } from "../hooks/useSession.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { faCircle, faAward, faIdCard, faGraduationCap, faUserShield, faPhone, faSitemap } from "@fortawesome/free-solid-svg-icons";
import config from "../utils/config.ts";
import { ribbonsMap } from '../utils/ribbonsMap.ts';
import { squadronIconsMap } from '../utils/squadronIcons.ts';

const rankIcons = import.meta.glob<{ default: string }>('../assets/icons/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

interface StructureElement {
    _id: string;
    name: string;
}

interface StructureSection {
    _id: string;
    name: string;
    icon?: string | null;
    elements?: StructureElement[];
}

interface StructureSquadron {
    _id: string;
    name: string;
    icon?: string | null;
    sections: StructureSection[];
}

interface EmployeeDetails {
    _id?: string;
    characterId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    doDId: string;
    rank: string;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    phone?: string | null;
    ribbons?: string[];
    squadronId?: string | null;
    sectionId?: string | null;
    elementId?: string | null;
}

const stripPaygradePrefix = (text: string): string => {
    return text
        .trim()
        .toLowerCase()
        .replace(/^[a-z]{1,2}[-_\s]?\d{1,2}[-_\s]?/i, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
};

const getRankIconUrl = (rankName: string): string | null => {
    if (!rankName) return null;
    const cleanRank = stripPaygradePrefix(rankName);

    for (const path in rankIcons) {
        const rawFileName = path.split('/').pop()?.split('.')[0] || '';
        const cleanFileName = stripPaygradePrefix(rawFileName);

        if (cleanFileName === cleanRank && cleanRank.length > 0) {
            return rankIcons[path].default;
        }
    }
    return null;
};

const RenderRankIcon = ({ rankName }: { rankName: string }) => {
    const iconSrc = getRankIconUrl(rankName);
    if (iconSrc) {
        return <img src={iconSrc} alt={rankName} className="w-5 h-5 object-contain inline-block" />;
    }
    return <FontAwesomeIcon icon={faGraduationCap} className="text-emerald-400" />;
};

const formatRibbonName = (key: string) => {
    return key
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};

export const Dashboard = () => {
    const { isAuth, loading, user, activeCharacter } = useSession();
    const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
    const [squadrons, setSquadrons] = useState<StructureSquadron[]>([]);
    const [empLoading, setEmpLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        const fetchCurrentEmployeeAndStructure = async () => {
            const charId = (activeCharacter as { _id?: string; id?: string } | null)?._id ||
                (activeCharacter as { _id?: string; id?: string } | null)?.id;

            if (!charId) {
                if (isMounted) setEmpLoading(false);
                return;
            }

            try {
                const [empRes, strRes] = await Promise.all([
                    fetch(`${config.URL}/employees`, { credentials: 'include' }),
                    fetch(`${config.URL}/structure`, { credentials: 'include' })
                ]);

                if (strRes.ok && isMounted) {
                    setSquadrons(await strRes.json());
                }

                if (empRes.ok) {
                    const data: EmployeeDetails[] = await empRes.json();
                    const found = data.find(e => String(e.characterId) === String(charId));
                    if (found && isMounted) {
                        setEmployee(found);
                    }
                }
            } catch (err) {
                console.error("Błąd podczas pobierania danych w Dashboardzie:", err);
            } finally {
                if (isMounted) setEmpLoading(false);
            }
        };

        void fetchCurrentEmployeeAndStructure();

        return () => {
            isMounted = false;
        };
    }, [activeCharacter]);

    const avatarUrl = user?.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null;

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-xs font-semibold">Aktywny</span>;
            case 'on_leave':
                return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded text-xs font-semibold">Urlop</span>;
            case 'suspended':
                return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded text-xs font-semibold">Zawieszony</span>;
            case 'terminated':
                return <span className="bg-stone-500/10 text-stone-400 border border-stone-500/20 px-2.5 py-0.5 rounded text-xs font-semibold">Zwolniony</span>;
            default:
                return null;
        }
    };

    const getStructurePath = () => {
        if (!employee?.squadronId) return null;

        const sq = squadrons.find(s => String(s._id) === String(employee.squadronId));
        if (!sq) return null;

        if (!employee.sectionId) return sq.name;

        const sec = sq.sections?.find(s => String(s._id) === String(employee.sectionId));
        if (!sec) return sq.name;

        if (!employee.elementId) return `${sq.name} ➔ ${sec.name}`;

        const elem = sec.elements?.find(e => String(e._id) === String(employee.elementId));
        return elem ? `${sq.name} ➔ ${sec.name} ➔ ${elem.name}` : `${sq.name} ➔ ${sec.name}`;
    };

    const getSectionIconUrl = (): string | null => {
        if (!employee?.squadronId || !employee?.sectionId) return null;
        const sq = squadrons.find(s => String(s._id) === String(employee.squadronId));
        if (!sq) return null;

        const sec = sq.sections?.find(s => String(s._id) === String(employee.sectionId));
        if (sec?.icon && squadronIconsMap[sec.icon]) {
            return squadronIconsMap[sec.icon];
        }
        return null;
    };

    const sectionIconUrl = getSectionIconUrl();

    return (
        <div className="p-6 space-y-6">
            <div className="flex gap-4 flex-wrap">
                <div className="bg-gray-800 text-white p-5 rounded-xl shadow-lg flex-1 min-w-64 border border-gray-700/50">
                    <h2 className="text-base font-semibold text-gray-400 mb-3">Połączenie Discord</h2>
                    {loading ? (
                        <p className="text-gray-400 text-sm">Ładowanie...</p>
                    ) : (
                        <div className="flex items-center gap-3">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
                            ) : (
                                <FontAwesomeIcon icon={faDiscord} className="text-indigo-400 text-3xl" />
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon
                                        icon={faCircle}
                                        className={`text-xs ${isAuth ? 'text-green-400' : 'text-red-400'}`}
                                    />
                                    <span className="text-sm font-semibold">
                                        {user?.global_name ?? user?.username ?? 'Nieznany użytkownik'}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-xs mt-0.5 font-mono">@{user?.username}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 text-white p-5 rounded-xl shadow-lg flex-1 min-w-64 border border-gray-700/50">
                    <h2 className="text-base font-semibold text-gray-400 mb-3">Server Stats</h2>
                    <p className="text-sm text-gray-300">🚀 Client: {window.location.origin}</p>
                    <p className="text-sm text-gray-300 mt-1">🚀 Server: {config.URL}</p>
                </div>
            </div>

            {activeCharacter && (
                <div className="bg-gray-800 border border-gray-700/50 text-white rounded-xl shadow-lg p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserShield} className="text-amber-500" />
                            Access Granted
                        </h2>
                        {employee && getStatusBadge(employee.status)}
                    </div>

                    {empLoading ? (
                        <p className="text-gray-400 text-sm italic">Pobieranie danych teczki...</p>
                    ) : employee ? (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                                <div className="w-24 h-24 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                    {employee.avatarUrl ? (
                                        <img src={employee.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faUserShield} className="text-gray-600 text-3xl" />
                                    )}
                                </div>

                                <div className="flex-1 text-center md:text-left space-y-3">
                                    <h3 className="text-xl font-bold text-white">
                                        {employee.firstName} {employee.lastName}
                                    </h3>

                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-300">
                                        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                                            <RenderRankIcon rankName={employee.rank} />
                                            <span>{employee.rank}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-gray-400 font-mono text-xs bg-gray-900/60 border border-gray-700/50 px-2.5 py-1 rounded">
                                            <FontAwesomeIcon icon={faIdCard} />
                                            <span>DoD ID: {employee.doDId}</span>
                                        </div>

                                        {employee.phone && (
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs bg-gray-900/60 border border-gray-700/50 px-2.5 py-1 rounded">
                                                <FontAwesomeIcon icon={faPhone} />
                                                <span>{employee.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {getStructurePath() && (
                                        <div className="flex justify-center md:justify-start">
                                            <div className="inline-flex items-center gap-1.5 text-amber-400 font-semibold text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded shadow-sm">
                                                <FontAwesomeIcon icon={faSitemap} />
                                                <span>{getStructurePath()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {sectionIconUrl && (
                                    <div className="shrink-0 flex items-center justify-center p-2 bg-gray-900/80 border border-gray-700/60 rounded-xl shadow-md">
                                        <img
                                            src={sectionIconUrl}
                                            alt="Oznaczenie sekcji"
                                            className="w-16 h-16 object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-700/60">
                                <h4 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faAward} />
                                    Baretki i Odznaczenia ({employee.ribbons?.length || 0})
                                </h4>

                                {employee.ribbons && employee.ribbons.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                        {employee.ribbons.map((ribbonKey, idx) => {
                                            const ribbonName = formatRibbonName(ribbonKey);
                                            return (
                                                <div
                                                    key={idx}
                                                    title={ribbonName}
                                                    className="relative group bg-gray-900/80 p-2 rounded-lg border border-gray-700/60 flex flex-col items-center justify-center hover:border-amber-500/50 transition-all cursor-pointer"
                                                >
                                                    {ribbonsMap[ribbonKey] ? (
                                                        <img
                                                            src={ribbonsMap[ribbonKey]}
                                                            alt={ribbonName}
                                                            className="h-8 object-contain transition-transform group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 truncate">{ribbonName}</span>
                                                    )}

                                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                        <div className="bg-gray-950 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-xl border border-gray-700 whitespace-nowrap">
                                                            {ribbonName}
                                                        </div>
                                                        <div className="w-2 h-2 bg-gray-950 border-r border-b border-gray-700 transform rotate-45 -mt-1"></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-xs italic">Brak nadanych baretek i odznaczeń dla tej postaci.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">Brak założonej teczki pracownika dla wybranej postaci.</p>
                    )}
                </div>
            )}
        </div>
    );
};