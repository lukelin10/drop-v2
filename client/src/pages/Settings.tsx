import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

type ThemeType = "light" | "dark" | "auto";

function Settings() {
  const { toast } = useToast();
  const { setLoading } = useAppContext();
  
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [fontSize, setFontSize] = useState<number[]>([3]);
  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    newAnalyses: true,
    emailUpdates: false
  });

  function handleLogout() {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    }, 1000);
  }

  function handleMenuItemClick() {
    toast({
      title: "Coming Soon",
      description: "This feature is not yet implemented.",
    });
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
      {/* User Profile */}
      <div className="px-4 mb-6">
        <div className="card">
          <CardContent className="p-5">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <i className="ri-user-3-line text-primary text-2xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-foreground">Jamie Smith</h3>
                <p className="text-sm text-muted-foreground">jamie.smith@example.com</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button 
                className="flex items-center justify-between w-full py-3 text-left rounded-lg px-2 hover:bg-muted text-foreground"
                onClick={handleMenuItemClick}
              >
                <span className="flex items-center">
                  <i className="ri-user-settings-line mr-3 text-primary"></i>
                  <span>Edit Profile</span>
                </span>
                <i className="ri-arrow-right-s-line text-muted-foreground"></i>
              </button>
              
              <button 
                className="flex items-center justify-between w-full py-3 text-left rounded-lg px-2 hover:bg-muted text-foreground"
                onClick={handleMenuItemClick}
              >
                <span className="flex items-center">
                  <i className="ri-lock-line mr-3 text-primary"></i>
                  <span>Change Password</span>
                </span>
                <i className="ri-arrow-right-s-line text-muted-foreground"></i>
              </button>
            </div>
          </CardContent>
        </div>
      </div>
      
      {/* Notifications */}
      <div className="px-4 mb-6">
        <div className="card">
          <CardContent className="p-5">
            <h3 className="font-medium text-foreground mb-4">Notifications</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="ri-notification-3-line mr-3 text-primary"></i>
                  <span className="text-foreground">Daily Question Reminders</span>
                </div>
                <Switch
                  checked={notifications.dailyReminders}
                  onCheckedChange={(checked) => setNotifications({...notifications, dailyReminders: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="ri-chat-1-line mr-3 text-primary"></i>
                  <span className="text-foreground">New Analyses</span>
                </div>
                <Switch
                  checked={notifications.newAnalyses}
                  onCheckedChange={(checked) => setNotifications({...notifications, newAnalyses: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="ri-mail-line mr-3 text-primary"></i>
                  <span className="text-foreground">Email Updates</span>
                </div>
                <Switch
                  checked={notifications.emailUpdates}
                  onCheckedChange={(checked) => setNotifications({...notifications, emailUpdates: checked})}
                />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      
      {/* Appearance */}
      <div className="px-4 mb-6">
        <div className="card">
          <CardContent className="p-5">
            <h3 className="font-medium text-foreground mb-4">Appearance</h3>
            
            <div className="mb-5">
              <label className="block text-sm text-foreground mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <div 
                  className={cn(
                    "rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer border",
                    theme === 'light' 
                      ? "bg-primary bg-opacity-10 border-primary" 
                      : "bg-muted border-border"
                  )}
                  onClick={() => setTheme('light')}
                >
                  <div className="rounded-full bg-accent w-8 h-8 mb-2 flex items-center justify-center">
                    <i className="ri-sun-line text-foreground"></i>
                  </div>
                  <span className="text-xs font-medium text-foreground">Light</span>
                </div>
                <div 
                  className={cn(
                    "rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer border",
                    theme === 'dark' 
                      ? "bg-primary bg-opacity-10 border-primary" 
                      : "bg-muted border-border"
                  )}
                  onClick={() => setTheme('dark')}
                >
                  <div className="rounded-full bg-background w-8 h-8 mb-2 flex items-center justify-center">
                    <i className="ri-moon-line text-accent"></i>
                  </div>
                  <span className="text-xs font-medium text-foreground">Dark</span>
                </div>
                <div 
                  className={cn(
                    "rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer border",
                    theme === 'auto' 
                      ? "bg-primary bg-opacity-10 border-primary" 
                      : "bg-muted border-border"
                  )}
                  onClick={() => setTheme('auto')}
                >
                  <div className="bg-gradient-to-r from-accent to-background rounded-full w-8 h-8 mb-2 flex items-center justify-center">
                    <i className="ri-contrast-line text-foreground"></i>
                  </div>
                  <span className="text-xs font-medium text-foreground">Auto</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-foreground mb-3">Text Size</label>
              <div className="flex items-center">
                <span className="text-xs text-foreground mr-2">A</span>
                <Slider 
                  value={fontSize} 
                  onValueChange={setFontSize} 
                  min={1} 
                  max={5} 
                  step={1} 
                  className="w-full"
                />
                <span className="text-lg text-foreground ml-2">A</span>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      
      {/* Support & About */}
      <div className="px-4 mb-6">
        <div className="card">
          <CardContent className="p-5">
            <h3 className="font-medium text-foreground mb-4">Support & About</h3>
            
            <div className="space-y-1">
              <button 
                className="flex items-center justify-between w-full py-3 text-left rounded-lg px-2 hover:bg-muted text-foreground"
                onClick={handleMenuItemClick}
              >
                <span className="flex items-center">
                  <i className="ri-question-line mr-3 text-primary"></i>
                  <span>Help Center</span>
                </span>
                <i className="ri-arrow-right-s-line text-muted-foreground"></i>
              </button>
              
              <button 
                className="flex items-center justify-between w-full py-3 text-left rounded-lg px-2 hover:bg-muted text-foreground"
                onClick={handleMenuItemClick}
              >
                <span className="flex items-center">
                  <i className="ri-shield-check-line mr-3 text-primary"></i>
                  <span>Privacy Policy</span>
                </span>
                <i className="ri-arrow-right-s-line text-muted-foreground"></i>
              </button>
              
              <button 
                className="flex items-center justify-between w-full py-3 text-left rounded-lg px-2 hover:bg-muted text-foreground"
                onClick={handleMenuItemClick}
              >
                <span className="flex items-center">
                  <i className="ri-file-text-line mr-3 text-primary"></i>
                  <span>Terms of Service</span>
                </span>
                <i className="ri-arrow-right-s-line text-muted-foreground"></i>
              </button>
              
              <div className="pt-4 border-t border-border mt-4">
                <p className="text-xs text-muted-foreground text-center">Drop v1.0.0</p>
                <p className="text-xs text-muted-foreground text-center mt-1">©2023 Drop Reflections</p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      
      {/* Logout Button */}
      <div className="px-4 mb-6">
        <Button 
          variant="outline" 
          className="w-full py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
    </section>
  );
}

export default Settings;