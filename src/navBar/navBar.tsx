import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../auth/supabaseConfig';
import { logoutUser } from '../auth/authService';
import { useUser } from '../context/UserContext';
import lucyaiLogo from '../img/lucyai.png';

// 仅保留系统管理图标
// Import regular SVG icons
import systemSVG from '../img/nav/system.svg';
import xhsSVG from '../img/nav/wechat.svg'; // 临时使用现有图标
import deviceSVG from '../img/nav/employee.svg'; // 临时使用现有图标

// 仅保留系统管理激活图标
// Import active SVG icons
import systemActiveSVG from '../img/active/system.svg';
import xhsActiveSVG from '../img/active/wechat.svg'; // 临时使用现有图标
import deviceActiveSVG from '../img/active/employee.svg'; // 临时使用现有图标

interface SubNavItem {
  name: string;
  url: string;
  adminOnly?: boolean;
}

interface NavItem {
  name: string;
  icon: string;
  url: string;
  adminOnly?: boolean;
  subItems?: SubNavItem[];
  expanded?: boolean;
}

interface NavItemWithIcons extends NavItem {
  activeIcon: string;
}

// 菜单项配置
const initialMenuItems: NavItemWithIcons[] = [
  { name: '系统管理', icon: systemSVG, activeIcon: systemActiveSVG, url: '/manage', adminOnly: true },
  { 
    name: '智能获客', 
    icon: xhsSVG, 
    activeIcon: xhsActiveSVG, 
    url: '/xhs', 
    adminOnly: false,
    subItems: [
      // { name: '自动化任务', url: '/xhs' },
      { name: '数据采集', url: '/xhs/collect' },
      { name: '数据筛选', url: '/xhs/filter' },
      { name: '数据分析', url: '/xhs/analyze' },
      { name: '触达用户', url: '/xhs/templates' },
      { name: '私信管理', url: '/xhs/generate' },
    ],
    expanded: false
  },
  { name: '设备管理', icon: deviceSVG, activeIcon: deviceActiveSVG, url: '/devices', adminOnly: false },
];

const NavBar: React.FC = () => {
  const [menuItems, setMenuItems] = useState<NavItemWithIcons[]>(initialMenuItems);
  
  // Combine all navigation items for route matching
  const allNavItems: NavItemWithIcons[] = [
    ...menuItems
  ];

  const findSelectedNavItem = (path: string) => {
    const currentPath = path.endsWith('/') ? path.slice(0, -1) : path;
    
    // Find a matching item in all navigation categories
    const matchingItem = allNavItems.find(item => 
      currentPath === item.url || 
      (currentPath.startsWith(item.url) && item.url !== '/dashboard') ||
      (item.subItems?.some(subItem => currentPath === subItem.url))
    );
    return matchingItem ? matchingItem.name : '系统管理';
  };
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(findSelectedNavItem(location.pathname));
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // 使用UserContext获取用户信息和管理员状态
  const { userProfile, isAdmin } = useUser();
  const [userData, setUserData] = useState<{displayName: string | null; email: string | null}>({
    displayName: null,
    email: null
  });

  useEffect(() => {
    setSelected(findSelectedNavItem(location.pathname));
    
    // Update expanded state based on current path
    setMenuItems(prevItems => 
      prevItems.map((item: NavItemWithIcons) => {
        const shouldExpand = item.subItems?.some((subItem: SubNavItem) => 
          location.pathname === subItem.url || location.pathname.startsWith(subItem.url + '/')
        );
        return shouldExpand ? { ...item, expanded: true } : item;
      })
    );
  }, [location.pathname]);

  // 不再需要嗅探用户是否为管理员，现在从上下文中获取

  // 结合认证状态和用户上下文
  useEffect(() => {
    // 订阅认证状态变化（仅用于基本登录信息）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          setUserData({
            displayName: user.user_metadata?.name || user.email?.split('@')[0] || null,
            email: user.email || null
          });
        } else if (event === 'SIGNED_OUT') {
          setUserData({
            displayName: null,
            email: null
          });
        }
      }
    );

    // 初始化当前用户的基本信息（仅在上下文加载之前使用）
    const initBasicUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          displayName: user.user_metadata?.name || user.email?.split('@')[0] || null,
          email: user.email || null
        });
      }
    };

    initBasicUserInfo();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 使用UserContext中的用户配置信息
  useEffect(() => {
    if (userProfile) {
      setUserData(prev => ({
        ...prev,
        displayName: userProfile.display_name || prev.displayName
      }));
    }
  }, [userProfile]);

  const handleClick = (item: NavItem) => {
    setSelected(item.name);
    
    // Toggle expanded state if item has subitems
    if (item.subItems && item.subItems.length > 0) {
      setMenuItems(prevItems => 
        prevItems.map((menuItem: NavItemWithIcons) => 
          menuItem.name === item.name 
            ? { ...menuItem, expanded: !menuItem.expanded } 
            : menuItem
        )
      );
      // Only navigate if clicking on an already expanded item or an item with no subitems
      if (!(item as NavItemWithIcons).expanded) {
        navigate(item.url);
      }
    } else {
      navigate(item.url);
    }
  };
  
  // 处理用户退出登录
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 点击外部关闭对话框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setShowLogoutDialog(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 监听窗口大小变化，当从手机尺寸变为桌面尺寸时关闭移动菜单
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Hamburger Menu with horizontal nav bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[rgba(248,213,126,1)] shadow-md flex items-center justify-between h-14">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-black hover:text-gray-800 p-4"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-start">
          <div className="bg-[rgba(248,213,126,1)] h-screen w-[85vw] shadow-lg overflow-y-auto flex flex-col transition-all duration-300 ease-in-out">
            {/* Mobile Menu Header with Close Button */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center space-x-2">
                <img src={lucyaiLogo} alt="LUCYAI" className="w-8 h-8" />
                <span className="text-2xl font-semibold text-black">LUCYAI</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-black/70 hover:text-black"
                aria-label="Close navigation menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Navigation Items */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col items-start space-y-1 mb-4 mt-2">
                {menuItems
                  .filter(item => !item.adminOnly || (item.adminOnly && isAdmin))
                  .map((item) => (
                    <div key={item.name} className="w-full px-2">
                      <div
                        className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg w-full
                          ${selected === item.name ? 'bg-white text-[rgba(248,213,126,1)]' : 'text-black hover:bg-[rgba(255,255,255,0.3)]'}`}
                        onClick={() => {
                          handleClick(item);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <img src={selected === item.name ? item.activeIcon : item.icon} alt={item.name} className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Mobile User Profile Section */}
            <div className="mt-auto pt-4 border-t border-white/20 relative p-2">
              <div className="flex items-center px-2">
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-[rgba(255,255,255,0.3)] rounded-lg p-2 w-full" 
                  onClick={() => setShowLogoutDialog(!showLogoutDialog)}
                  title="点击显示选项"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.displayName || userData.email || 'User'}`}
                    alt="User"
                    className="w-8 h-8 rounded-full bg-white"
                  />
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium truncate text-black">
                      {userData.displayName || userData.email?.split('@')[0] || '用户'}
                    </div>
                    <div 
                      className="text-xs text-black/70 truncate"
                      title={userData.email || '账号'}
                    >
                      {userData.email || '账号'}
                    </div>
                  </div>
                </div>
              </div>

              {showLogoutDialog && (
                <div 
                  ref={dialogRef}
                  className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-lg py-2 border border-gray-200"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-[rgba(248,213,126,1)]"
                  >
                    退出登录
                  </button>
                  <button
                    onClick={() => navigate('/charge')}
                    className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-[rgba(248,213,126,1)]"
                  >
                    充值中心
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Desktop Navigation */}
      <div className={`hidden md:flex bg-[rgba(248,213,126,1)] p-2 ${isCollapsed ? 'w-[4.5vw]' : 'w-[10vw]'} rounded-lg shadow-lg h-screen flex-col transition-all duration-300 text-base text-black`}>
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center space-x-2">
            <img src={lucyaiLogo} alt="LUCYAI" className="w-8 h-8" />
            {!isCollapsed && <span className="text-2xl font-semibold text-black">LUCYAI</span>}
          </div>
          <button 
            onClick={toggleCollapse}
            className="text-black/70 hover:text-black"
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19.5-7.5-7.5 7.5-7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-start space-y-1 mb-4 mt-2">
            {menuItems
              .filter(item => !item.adminOnly || (item.adminOnly && isAdmin))
              .map((item) => (
                <div key={item.name} className="w-full px-2">
                  <div
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} cursor-pointer p-2 rounded-lg w-full
                      ${selected === item.name ? 'bg-white text-[rgba(248,213,126,1)]' : 'text-black hover:bg-[rgba(255,255,255,0.3)]'}`}
                    onClick={() => handleClick(item)}
                  >
                    <div className="flex items-center space-x-3">
                      <img src={selected === item.name ? item.activeIcon : item.icon} alt={item.name} className="w-5 h-5" />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </div>
                    {!isCollapsed && item.subItems && item.subItems.length > 0 && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth="1.5" 
                        stroke="currentColor" 
                        className={`w-4 h-4 transition-transform ${item.expanded ? 'rotate-90' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Sub-navigation items */}
                  {!isCollapsed && item.expanded && item.subItems && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem: SubNavItem) => (
                        <div 
                          key={subItem.name}
                          className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg w-full
                            ${location.pathname === subItem.url ? 'bg-white/40 text-black font-medium' : 'text-black/80 hover:bg-white/30'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(subItem.url);
                          }}
                        >
                          <span className="text-sm">{subItem.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* User Profile Section */}
        <div className="mt-auto pt-4 border-t border-white/20 relative">
          <div className="flex items-center justify-between px-2">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-[rgba(255,255,255,0.3)] rounded-lg p-1 w-full" 
              onClick={() => setShowLogoutDialog(!showLogoutDialog)}
              title="点击显示选项"
            >
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.displayName || userData.email || 'User'}`}
                alt="User"
                className="w-8 h-8 rounded-full bg-white"
              />
              {!isCollapsed && (
                <div className="max-w-[10vw] overflow-hidden">
                  <div className="text-sm font-medium truncate text-black">
                    {userData.displayName || userData.email?.split('@')[0] || '用户'}
                  </div>
                  <div 
                    className="text-xs text-black/70 truncate"
                    title={userData.email || '账号'}
                  >
                    {userData.email || '账号'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showLogoutDialog && !isCollapsed && (
            <div 
              ref={dialogRef}
              className="absolute bottom-full left-0 mb-2 w-30 bg-white rounded-lg shadow-lg py-2 border border-gray-200"
            >
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-[rgba(248,213,126,1)]"
              >
                退出登录
              </button>
              <button
                onClick={() => navigate('/charge')}
                className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-[rgba(248,213,126,1)]"
              >
                充值中心
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NavBar;
