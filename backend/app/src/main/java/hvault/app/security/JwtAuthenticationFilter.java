package hvault.app.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import hvault.app.repository.UserRepository;
import hvault.app.repository.projection.AuthUserView;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            JwtService.JwtClaims claims = jwtService.validateToken(authorization.substring(7));
            if (claims != null && matchesCurrentUser(claims)) {
                String role = "ROLE_" + claims.role();
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    claims.username(),
                    null,
                    List.of(new SimpleGrantedAuthority(role))
                );
                authentication.setDetails(claims);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }

    // Re-check the token against the live user row. This blocks tokens whose user
    // was deleted, whose userId was reused by a different account (e.g. after a DB
    // wipe + id reset), or whose sessions were invalidated by bumping token_version.
    private boolean matchesCurrentUser(JwtService.JwtClaims claims) {
        AuthUserView user = userRepository.findAuthViewById(claims.userId()).orElse(null);
        if (user == null) {
            return false;
        }
        int currentVersion = user.getTokenVersion() == null ? 0 : user.getTokenVersion();
        return user.getUsername().equals(claims.username()) && currentVersion == claims.tokenVersion();
    }
}
