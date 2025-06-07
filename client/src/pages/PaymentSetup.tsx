import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, DollarSign, University } from "lucide-react";
import { SiStripe, SiPaypal } from "react-icons/si";

const paymentSettingsSchema = z.object({
  stripeAccountId: z.string().optional(),
  paypalAccountId: z.string().optional(),
  bankTransferEnabled: z.boolean().default(false),
  defaultPaymentTerms: z.number().default(30),
  lateFeePercentage: z.string().default("0"),
});

type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;

export default function PaymentSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ["/api/payment-settings"],
    retry: false,
  });

  const form = useForm<PaymentSettingsFormData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      stripeAccountId: "",
      paypalAccountId: "",
      bankTransferEnabled: false,
      defaultPaymentTerms: 30,
      lateFeePercentage: "0",
    },
  });

  // Update form when payment settings are loaded
  React.useEffect(() => {
    if (paymentSettings) {
      form.reset({
        stripeAccountId: paymentSettings.stripeAccountId || "",
        paypalAccountId: paymentSettings.paypalAccountId || "",
        bankTransferEnabled: paymentSettings.bankTransferEnabled || false,
        defaultPaymentTerms: paymentSettings.defaultPaymentTerms || 30,
        lateFeePercentage: paymentSettings.lateFeePercentage || "0",
      });
    }
  }, [paymentSettings, form]);

  const updatePaymentSettingsMutation = useMutation({
    mutationFn: async (data: PaymentSettingsFormData) => {
      await apiRequest("POST", "/api/payment-settings", {
        ...data,
        lateFeePercentage: data.lateFeePercentage,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnectStripe = () => {
    // In a real implementation, this would redirect to Stripe Connect
    toast({
      title: "Stripe Integration",
      description: "Stripe Connect integration would be implemented here",
    });
  };

  const handleConnectPayPal = () => {
    // In a real implementation, this would redirect to PayPal Connect
    toast({
      title: "PayPal Integration", 
      description: "PayPal Connect integration would be implemented here",
    });
  };

  const onSubmit = (data: PaymentSettingsFormData) => {
    updatePaymentSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-8"></div>
          <div className="space-y-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-300 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isStripeConnected = paymentSettings?.stripeAccountId;
  const isPayPalConnected = paymentSettings?.paypalAccountId;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Setup</h1>
        <p className="text-gray-600">Connect your payment providers to receive online payments</p>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Stripe Integration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <SiStripe className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Stripe</h3>
                  <p className="text-sm text-gray-600">Accept credit card payments securely</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-3">
                  {isStripeConnected ? "Connected" : "Not Connected"}
                </span>
                <div className={`w-12 h-6 rounded-full relative ${isStripeConnected ? 'bg-primary' : 'bg-gray-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${isStripeConnected ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {!isStripeConnected ? (
                <Button 
                  onClick={handleConnectStripe}
                  className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <SiStripe className="mr-2" />
                  Connect with Stripe
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-green-600 font-medium">✓ Stripe account connected</p>
                  <Button variant="outline" className="w-full">
                    Manage Stripe Settings
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                You'll be redirected to Stripe to complete the connection
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PayPal Integration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <SiPaypal className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">PayPal</h3>
                  <p className="text-sm text-gray-600">Accept PayPal and credit card payments</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-3">
                  {isPayPalConnected ? "Connected" : "Not Connected"}
                </span>
                <div className={`w-12 h-6 rounded-full relative ${isPayPalConnected ? 'bg-primary' : 'bg-gray-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${isPayPalConnected ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {!isPayPalConnected ? (
                <Button 
                  onClick={handleConnectPayPal}
                  className="w-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <SiPaypal className="mr-2" />
                  Connect with PayPal
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-green-600 font-medium">✓ PayPal account connected</p>
                  <Button variant="outline" className="w-full">
                    Manage PayPal Settings
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                You'll be redirected to PayPal to complete the connection
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer Settings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <University className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bank Transfer</h3>
                <p className="text-sm text-gray-600">Allow customers to pay via direct bank transfer</p>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bankTransferEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm text-gray-600">
                        Enable bank transfer instructions on invoices
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Default Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="defaultPaymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Due (Days)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="45">45 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lateFeePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Fee (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            step="0.1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={updatePaymentSettingsMutation.isPending}
                  className="bg-primary text-white hover:bg-blue-700"
                >
                  {updatePaymentSettingsMutation.isPending ? "Updating..." : "Save Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
