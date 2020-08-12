# CHIP-8 web impl

# 做了一点微小的工作 把 [massung](https://github.com/massung) 的 [CHIP-8](https://github.com/massung/CHIP-8) 翻译成了web,很惭愧


# 规范
## 内存
共有4kb内存 0x0 - 0xfff,前512字节(0x0-0x1ff)给解释器预留使用的,程序的入口是0x200(512),
有些是从0x600开始的,是为eti 600主机做的
## 寄存器
16个8位通用寄存器 v0-vf
一16位个地址寄存器 i,通常只有后12位会用到
一个16位的程序地址指针PC,表示当前程序执行到哪块内存了(指令指针)
一个8位的栈指针SP,指向栈顶
栈是16个16位的数组,程序最多递归16级
两个8位定时器寄存器
> 延迟定时器 DT
> 声音定时器 ST
## 显示
屏幕共有64*32个像素,
## 键盘
共有16个操作键 0-9 a-f

## 定时器

延时定时器 DT: 当数值不为0时 程序以每秒60次的速度减1 
声音定时器 ST: 当数值不为0时 程序以每秒60次的速度减1并同时发生声音 

## 指令
共36个指令,指令都是2个字节,先存储高位(小端字节序) 假如指令时0x1234 那么在内存中就是 34 12

每条指令的第一个字节位于偶数地址
`nnn` 一个12位的值,保存了地址,取低12位
`n` 一个4位的值,取低4位
`x` 一个4位的值,取高字节的低4位
`y` 一个4位的值,取低字节的高4位
`kk` 一个8位的值,取低八位

标准指令:

- `0{nnn}` : sys address Jump to a machine code routine at nnn.
- `00E0` : CLS 清屏
- `00EE` : RET 返回,设置指令指针为栈顶地址,并将栈指针减1
- `1{nnn}`: JMP 跳转到某个地址,设置指令指针为{nnn}
- `2{nnn}`: CALL 调用某个函数,将栈指针+1,设置栈顶为当前指令指针值,之后设置指令指针值为`{nnn}`
- `3{x}{kk}`: SE V{x}, {kk} ,比较寄存器V{x}和{kk}的值 如果相同,跳过下一条指令 pc+=2
- `4{x}{kk}`: SNE V{x}, {kk} ,比较寄存器V{x}和{kk}的值 如果不相同,跳过下一条指令 pc+=2
- `5{x}{y}0`: SE V{x}, {y} ,比较寄存器V{x}和V{y}的值 如果相同,跳过下一条指令 pc+=2
- `6{x}{kk}`: LD V{x}, {kk} ,设置寄存器V{x}为{kk}
- `7{x}{kk}`: Add Set V{x} += {kk}
- `8{x}{y}0`: LD V{x}, {y} 设置寄存器V{x}为V{y}
- `8{x}{y}1`: OR V{x}, V{y} ,V{x}|=V{y}  
- `8{x}{y}2`: AND V{x}, V{y} ,V{x}&=V{y}  
- `8{x}{y}3`: XOR V{x}, V{y} ,V{x}^=V{y}  
- `8{x}{y}4`: ADD V{x}, V{y}, Set V{x} += V{y}, set VF = 溢出. v{x}+=v{y} ,如果结果大于8位 设置VF 为1表示溢出了 
- `8{x}{y}5`: SUB V{x}, V{y}, Set V{x} -= Vy, set VF = 结果为正数. 如果结果大于0 设置VF 为1表示结果为正数
- `8{x}{y}6`: SHR V{x}[,V{y}] 右移 V{X}>>=1,如果V{X}为奇数设置VF为1否则设为0
- `8{x}{y}7`: SUBN V{x}, V{y}, Set V{x} = Vy-V{x}, set VF = 结果为正数
- `8{x}{y}e`: SHL V{x}[,V{y}] 左移 V{X}<<=1,如果V{X}最高有效位是1(是负数)设置VF为1否则设为0
- `9{x}{y}0`: SNE V{x} Vy,如果Vx!=Vy 则跳过下条指令
- `a{nnn}`: LD I {nnn}, set I = {nnn}
- `b{nnn}`: JP V0, addr, 设置pc为V0+{nnn}
- `c{x}{kk}`: RND V{x}, byte, 生成一个随机数(0-255) 并和{kk}做与运算然后存入V{x}
- `d{x}{y}n`: DRW V{x}, Vy, nibble
- `e{x}9e`: SKP V{x} 如果 V{x} 对应的按键被按下跳过下条指令
- `e{x}a1`: SKNP V{x}  如果 V{x} 对应的按键没有被按下跳过下条指令
- `f{x}07`: LD V{x}, DT Set V{x} = delay timer value
- `f{x}0a`: LD V{x}, K 等待按键,并将按键的值保存到Vx中
- `f{x}15`: LD DT, V{x} Set delay timer = V{x}
- `f{x}18`: LD ST, V{x} Set sound timer = V{x}
- `f{x}1e`: ADD I, V{x} Set I += V{x}
- `f{x}29`: LD F, V{x} 设置I = v{x}对应可视化字符保存的地址,也就是载入对应字体的地址
- `f{x}33`: LD B, V{x} 将Vx的十进制数的百位保存到I中,十位保存到I+1,个位保存到I+2
- `f{x}55`: LD [I], V{x} 从位置I开始将寄存器V0至V{x}存储在内存中
- `f{x}65`: LD V{x}, [I] 从位置I开始将值写入寄存器V0至V{x}中
