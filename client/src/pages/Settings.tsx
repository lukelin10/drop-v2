import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";

type ThemeType = "light" | "dark" | "auto";

function Settings() {
  const { toast } = useToast();
  const { setLoading } = useAppContext();
  
  const [theme, setTheme] = useState<ThemeType>("light");
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
    <section className="px-4 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Settings</h2>
        <p className="text-sm text-foreground opacity-70">Customize your Drop experience</p>
      </div>
      
      {/* User Profile */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
              <i className="ri-user-3-line text-primary text-2xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-foreground">Jamie Smith</h3>
              <p className="text-sm text-foreground opacity-70">jamie.smith@example.com</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <button 
              className="flex items-center justify-between w-full py-2 text-left text-foreground"
              onClick={handleMenuItemClick}
            >
              <span className="flex items-center">
                <i className="ri-user-settings-line mr-3 text-primary"></i>
                <span>Edit Profile</span>
              </span>
              <i className="ri-arrow-right-s-line text-foreground opacity-50"></i>
            </button>
            
            <button 
              className="flex items-center justify-between w-full py-2 text-left text-foreground"
              onClick={handleMenuItemClick}
            >
              <span className="flex items-center">
                <i className="ri-lock-line mr-3 text-primary"></i>
                <span>Change Password</span>
              </span>
              <i className="ri-arrow-right-s-line text-foreground opacity-50"></i>
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Notifications */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Notifications</h3>
          
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
      </Card>
      
      {/* Appearance */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Appearance</h3>
          
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <div 
                className={`${theme === 'light' ? 'bg-accent border-2 border-primary' : 'bg-accent'} rounded-lg p-2 flex items-center justify-center cursor-pointer`}
                onClick={() => setTheme('light')}
              >
                <span className="text-xs font-medium text-foreground">Light</span>
              </div>
              <div 
                className={`${theme === 'dark' ? 'bg-background border-2 border-primary' : 'bg-background'} rounded-lg p-2 flex items-center justify-center cursor-pointer`}
                onClick={() => setTheme('dark')}
              >
                <span className="text-xs font-medium text-accent">Dark</span>
              </div>
              <div 
                className={`${theme === 'auto' ? 'border-2 border-primary' : ''} bg-gradient-to-r from-accent to-background rounded-lg p-2 flex items-center justify-center cursor-pointer`}
                onClick={() => setTheme('auto')}
              >
                <span className="text-xs font-medium text-foreground">Auto</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-foreground mb-2">Text Size</label>
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
      </Card>
      
      {/* Support & About */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Support & About</h3>
          
          <div className="space-y-4">
            <button 
              className="flex items-center justify-between w-full py-2 text-left text-foreground"
              onClick={handleMenuItemClick}
            >
              <span className="flex items-center">
                <i className="ri-question-line mr-3 text-primary"></i>
                <span>Help Center</span>
              </span>
              <i className="ri-arrow-right-s-line text-foreground opacity-50"></i>
            </button>
            
            <button 
              className="flex items-center justify-between w-full py-2 text-left text-foreground"
              onClick={handleMenuItemClick}
            >
              <span className="flex items-center">
                <i className="ri-shield-check-line mr-3 text-primary"></i>
                <span>Privacy Policy</span>
              </span>
              <i className="ri-arrow-right-s-line text-foreground opacity-50"></i>
            </button>
            
            <button 
              className="flex items-center justify-between w-full py-2 text-left text-foreground"
              onClick={handleMenuItemClick}
            >
              <span className="flex items-center">
                <i className="ri-file-text-line mr-3 text-primary"></i>
                <span>Terms of Service</span>
              </span>
              <i className="ri-arrow-right-s-line text-foreground opacity-50"></i>
            </button>
            
            <div className="pt-2">
              <p className="text-xs text-foreground opacity-50 text-center">Drop v1.0.0</p>
              <p className="text-xs text-foreground opacity-50 text-center mt-1">©2023 Drop Reflections</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Logout Button */}
      <Button 
        variant="outline" 
        className="w-full py-3 bg-white border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all"
        onClick={handleLogout}
      >
        Log Out
      </Button>
    </section>
  );
}

export default Settings;
