Set WshShell = CreateObject("WScript.Shell")
' Chạy lệnh node server.js trong thư mục server mà không hiện cửa sổ (0)
WshShell.Run "cmd /c cd /d ""d:\My vscode\thuchi\server"" && node server.js", 0, False
' Đợi 2 giây cho server khởi động
WScript.Sleep 2000
' Tự động mở trình duyệt tới địa chỉ app
WshShell.Run "http://localhost:5001"
