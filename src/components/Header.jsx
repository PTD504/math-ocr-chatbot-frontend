import React from 'react';

const Header = ({ userProfile, onMenuClick, showMenuButton, getUserInitials }) => {
    return (
        <header className="bg-[#212121] border-b border-[#2c2c2c] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {/* Menu button for mobile */}
                {showMenuButton && (
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 hover:bg-[#2c2c2c] rounded-full transition-colors"
                    >
                        <i className="fas fa-bars text-[#e5e7eb]"></i>
                    </button>
                )}
                
                {/* Logo/Title */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <i className="fas fa-calculator text-white text-sm"></i>
                    </div>
                    <h1 className="text-xl font-bold text-[#e5e7eb]">
                        Math LaTeX Assistant
                    </h1>
                </div>
            </div>

            {/* User info */}
            {userProfile && (
                <div className="flex items-center gap-3">
                    {userProfile.picture ? (
                        <img 
                            src={userProfile.picture} 
                            alt={userProfile.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    
                    {/* Fallback avatar with initials */}
                    <div 
                        className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold ${
                            userProfile.picture ? 'hidden' : 'flex'
                        }`}
                    >
                        {getUserInitials(userProfile.name)}
                    </div>
                    
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-[#e5e7eb]">
                            {userProfile.name}
                        </p>
                        <p className="text-xs text-[#a0a0a0]">
                            {userProfile.isAnonymous ? 'Tài khoản khách' : 'Đã đăng nhập'}
                        </p>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;