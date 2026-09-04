package com.aniversario.config;

import com.aniversario.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminTokenInterceptor implements HandlerInterceptor {

    public static final String ADMIN_TOKEN_HEADER = "X-Admin-Token";

    private final AppProperties appProperties;

    public AdminTokenInterceptor(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String token = request.getHeader(ADMIN_TOKEN_HEADER);
        if (token == null || token.isBlank() || !token.equals(appProperties.getAdminToken())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token de administrador inválido ou ausente.");
        }
        return true;
    }
}
