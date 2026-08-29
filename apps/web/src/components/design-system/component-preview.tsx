"use client";

import { ArrowLeft, CheckCircle2, Info, Send } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const sectionClassName = "flex scroll-mt-8 flex-col gap-5";
const roleItems = [
  { label: "管理员", value: "admin" },
  { label: "成员", value: "member" },
  { label: "只读访客", value: "viewer" },
];

export function ComponentPreview() {
  return (
    <main className="min-h-screen bg-muted/35">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")} href="/">
            <ArrowLeft data-icon="inline-start" />
            返回首页
          </Link>
          <Badge variant="outline">shadcn/ui · Base UI</Badge>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:py-16">
        <div className="max-w-3xl">
          <p className="font-mono text-sm text-muted-foreground">LinOnward Design System</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            组件预览
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground text-pretty">
            集中查看 Web 端基础组件、交互状态与组合方式。页面会自动跟随系统的浅色或深色外观。
          </p>
        </div>

        <Separator />

        <section className={sectionClassName} id="actions">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">按钮与状态</h2>
            <p className="mt-1 text-sm text-muted-foreground">常用操作层级、尺寸和业务状态。</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Button</CardTitle>
              <CardDescription>使用内置 variant 表达操作的重要程度。</CardDescription>
              <CardAction>
                <Badge>稳定</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>
                <Send data-icon="inline-start" />
                主要操作
              </Button>
              <Button variant="secondary">次要操作</Button>
              <Button variant="outline">描边按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="destructive">危险操作</Button>
              <Button disabled>不可用</Button>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Badge>默认</Badge>
              <Badge variant="secondary">处理中</Badge>
              <Badge variant="outline">草稿</Badge>
              <Badge variant="destructive">失败</Badge>
            </CardFooter>
          </Card>
        </section>

        <section className={sectionClassName} id="forms">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">表单控件</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              标签、帮助文本和控件保持可访问关联。
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>新建工作区</CardTitle>
              <CardDescription>这是输入、选择与布尔控件的组合示例。</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="preview-name">工作区名称</FieldLabel>
                    <Input id="preview-name" placeholder="例如：增长团队" />
                    <FieldDescription>显示在导航和邀请邮件中。</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="preview-role">默认角色</FieldLabel>
                    <Select defaultValue="member" items={roleItems}>
                      <SelectTrigger className="w-full" id="preview-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>角色</SelectLabel>
                          {roleItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="preview-description">说明</FieldLabel>
                  <Textarea id="preview-description" placeholder="补充这个工作区的用途…" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field orientation="horizontal">
                    <Checkbox defaultChecked id="preview-updates" />
                    <FieldContent>
                      <FieldLabel htmlFor="preview-updates">接收产品更新</FieldLabel>
                      <FieldDescription>每月最多发送一封邮件。</FieldDescription>
                    </FieldContent>
                  </Field>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="preview-public">公开工作区</FieldLabel>
                      <FieldDescription>允许持有链接的人查看。</FieldDescription>
                    </FieldContent>
                    <Switch id="preview-public" />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost">取消</Button>
              <Button>创建工作区</Button>
            </CardFooter>
          </Card>
        </section>

        <section className={sectionClassName} id="feedback">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">标签页与反馈</h2>
            <p className="mt-1 text-sm text-muted-foreground">用于内容切换和向用户传递结果。</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
                <CardDescription>键盘可操作的内容分组。</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList aria-label="项目视图">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="activity">活动</TabsTrigger>
                  </TabsList>
                  <TabsContent className="pt-4 leading-7 text-muted-foreground" value="overview">
                    关键指标、成员和近期状态会汇总在概览中。
                  </TabsContent>
                  <TabsContent className="pt-4 leading-7 text-muted-foreground" value="activity">
                    最近的组件更新会显示在这里。
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert</CardTitle>
                <CardDescription>信息提示与成功状态。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Alert>
                  <Info />
                  <AlertTitle>预览环境</AlertTitle>
                  <AlertDescription>这里的操作仅用于展示组件状态。</AlertDescription>
                </Alert>
                <Alert>
                  <CheckCircle2 />
                  <AlertTitle>配置已保存</AlertTitle>
                  <AlertDescription>新的设计 token 已应用到 Web 端。</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
